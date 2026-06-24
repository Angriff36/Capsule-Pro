"use client";

import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { captureException } from "@sentry/nextjs";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface RecipeStep {
  durationMinutes: number | null;
  equipmentNeeded: string[] | null;
  imageUrl: string | null;
  instruction: string;
  stepNumber: number;
  temperatureUnit: string | null;
  temperatureValue: number | null;
  tips: string | null;
  videoUrl: string | null;
}

interface RecipeStepsResponse {
  cookTimeMinutes: number | null;
  description: string | null;
  prepTimeMinutes: number | null;
  recipeId: string;
  recipeName: string;
  recipeVersionId: string;
  restTimeMinutes: number | null;
  steps: RecipeStep[];
  totalDuration: number;
  yieldQuantity: number | null;
  yieldUnit: string | null;
}

interface RecipeIngredient {
  id: string;
  isOptional: boolean;
  name: string;
  notes: string | null;
  orderIndex: number;
  quantity: number;
  unitCode: string;
}

interface MobileRecipeClientProps {
  recipeId: string;
  tenantId: string;
}

// Recipe cache storage keys
const CACHE_PREFIX = "recipe_cache_";
const CACHE_VERSION = "v1";
const CACHE_TIMESTAMP_KEY = `${CACHE_PREFIX}${CACHE_VERSION}_timestamp_`;
const CACHE_STEPS_KEY = `${CACHE_PREFIX}${CACHE_VERSION}_steps_`;
const CACHE_INGREDIENTS_KEY = `${CACHE_PREFIX}${CACHE_VERSION}_ingredients_`;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cache storage functions
const saveRecipeToCache = (
  recipeId: string,
  stepsData: RecipeStepsResponse,
  ingredientsData: RecipeIngredient[]
): void => {
  try {
    const timestamp = Date.now();
    localStorage.setItem(
      `${CACHE_TIMESTAMP_KEY}${recipeId}`,
      timestamp.toString()
    );
    localStorage.setItem(
      `${CACHE_STEPS_KEY}${recipeId}`,
      JSON.stringify(stepsData)
    );
    localStorage.setItem(
      `${CACHE_INGREDIENTS_KEY}${recipeId}`,
      JSON.stringify(ingredientsData)
    );
  } catch {
    // Silently fail if localStorage is not available
  }
};

const loadRecipeFromCache = (
  recipeId: string
): { steps: RecipeStepsResponse; ingredients: RecipeIngredient[] } | null => {
  try {
    const timestamp = localStorage.getItem(`${CACHE_TIMESTAMP_KEY}${recipeId}`);
    if (!timestamp) {
      return null;
    }

    const age = Date.now() - Number.parseInt(timestamp, 10);
    if (age > CACHE_EXPIRY_MS) {
      // Cache expired
      clearRecipeCache(recipeId);
      return null;
    }

    const stepsData = localStorage.getItem(`${CACHE_STEPS_KEY}${recipeId}`);
    const ingredientsData = localStorage.getItem(
      `${CACHE_INGREDIENTS_KEY}${recipeId}`
    );

    if (!(stepsData && ingredientsData)) {
      return null;
    }

    return {
      steps: JSON.parse(stepsData) as RecipeStepsResponse,
      ingredients: JSON.parse(ingredientsData) as RecipeIngredient[],
    };
  } catch {
    return null;
  }
};

const clearRecipeCache = (recipeId: string): void => {
  try {
    localStorage.removeItem(`${CACHE_TIMESTAMP_KEY}${recipeId}`);
    localStorage.removeItem(`${CACHE_STEPS_KEY}${recipeId}`);
    localStorage.removeItem(`${CACHE_INGREDIENTS_KEY}${recipeId}`);
  } catch {
    // Silently fail
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatMinutes = (minutes?: number | null): string => {
  if (!minutes || minutes <= 0) {
    return "-";
  }
  return `${minutes}m`;
};

const scaleQuantity = (quantity: number, scale: number): string => {
  const scaled = quantity * scale;
  // Format to 2 decimal places if needed, remove trailing zeros
  return scaled.toFixed(2).replace(/\.?0+$/, "");
};

export const MobileRecipeClient = ({
  recipeId,
  tenantId: _tenantId,
}: MobileRecipeClientProps) => {
  const [recipe, setRecipe] = useState<RecipeStepsResponse | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [initialTime, setInitialTime] = useState(0);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch recipe data with offline support
  useEffect(() => {
    const fetchRecipeData = async () => {
      try {
        setLoading(true);

        // First, try to load from cache for instant display
        const cachedData = loadRecipeFromCache(recipeId);
        if (cachedData) {
          setRecipe(cachedData.steps);
          setIngredients(cachedData.ingredients);
          setIsFromCache(true);
          setLoading(false);

          // If offline, show a toast
          if (!navigator.onLine) {
            toast.info("Loaded from offline cache", {
              icon: <WifiOff className="h-4 w-4" />,
            });
          }
        }

        // If online, fetch fresh data
        if (navigator.onLine) {
          // NOTE: Keeping apiFetch — these are recipe-specific nested endpoints (steps/ingredients by recipeId)
          // with custom response shapes that differ from generated listRecipeSteps/listRecipeIngredients.
          const [stepsRes, ingredientsRes] = await Promise.all([
            apiFetch(`/api/kitchen/recipes/${recipeId}/steps`),
            apiFetch(`/api/kitchen/recipes/${recipeId}/ingredients`),
          ]);

          if (!(stepsRes.ok && ingredientsRes.ok)) {
            throw new Error("Failed to fetch recipe data");
          }

          const [stepsData, ingredientsData] = await Promise.all([
            stepsRes.json() as Promise<RecipeStepsResponse>,
            ingredientsRes.json() as Promise<{
              ingredients: RecipeIngredient[];
            }>,
          ]);

          setRecipe(stepsData);
          setIngredients(ingredientsData.ingredients);
          setIsFromCache(false);

          // Save to cache for offline use
          saveRecipeToCache(recipeId, stepsData, ingredientsData.ingredients);

          // Show toast if we updated from cache
          if (cachedData) {
            toast.success("Recipe updated", {
              icon: <Wifi className="h-4 w-4" />,
            });
          }
        } else if (!cachedData) {
          // Offline and no cache available
          toast.error("No internet connection and no cached data available");
        }
      } catch (error) {
        captureException(error);
        // Check if we have data using functional update to avoid recipe in deps
        setRecipe((currentRecipe) => {
          if (!currentRecipe) {
            toast.error("Failed to load recipe");
          }
          return currentRecipe;
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRecipeData();
  }, [recipeId]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            toast.success("Timer complete!");
            // Play sound if available
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("Timer Complete!", {
                body: "Step timer has finished.",
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerRunning, timerSeconds]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const startTimer = useCallback((durationMinutes: number) => {
    const seconds = durationMinutes * 60;
    setInitialTime(seconds);
    setTimerSeconds(seconds);
    setTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerSeconds(initialTime);
  }, [initialTime]);

  const goToNextStep = useCallback(() => {
    if (recipe && currentStep < recipe.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setTimerRunning(false);
      setTimerSeconds(0);
    }
  }, [recipe, currentStep]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setTimerRunning(false);
      setTimerSeconds(0);
    }
  }, [currentStep]);

  const refreshRecipe = useCallback(async () => {
    if (!isOnline) {
      toast.error("Cannot refresh while offline");
      return;
    }

    try {
      toast.info("Refreshing recipe...", {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
      });

      // NOTE: Keeping apiFetch — same nested recipe endpoints as above, see NOTE there.
      const [stepsRes, ingredientsRes] = await Promise.all([
        apiFetch(`/api/kitchen/recipes/${recipeId}/steps`),
        apiFetch(`/api/kitchen/recipes/${recipeId}/ingredients`),
      ]);

      if (!(stepsRes.ok && ingredientsRes.ok)) {
        throw new Error("Failed to fetch recipe data");
      }

      const [stepsData, ingredientsData] = await Promise.all([
        stepsRes.json() as Promise<RecipeStepsResponse>,
        ingredientsRes.json() as Promise<{ ingredients: RecipeIngredient[] }>,
      ]);

      setRecipe(stepsData);
      setIngredients(ingredientsData.ingredients);
      setIsFromCache(false);

      // Save to cache for offline use
      saveRecipeToCache(recipeId, stepsData, ingredientsData.ingredients);

      toast.success("Recipe updated successfully", {
        icon: <Wifi className="h-4 w-4" />,
      });
    } catch (error) {
      captureException(error);
      toast.error("Failed to refresh recipe");
    }
  }, [isOnline, recipeId]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Voice/hands-free navigation
      if (e.key === "ArrowRight" || e.key === " ") {
        goToNextStep();
      } else if (e.key === "ArrowLeft") {
        goToPrevStep();
      }
    },
    [goToNextStep, goToPrevStep]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent border-solid" />
          <p className="mt-4 text-muted-foreground text-sm">
            Loading recipe...
          </p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Recipe not found</p>
      </div>
    );
  }

  const currentStepData = recipe.steps[currentStep];
  if (!currentStepData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">No steps available for this recipe</p>
      </div>
    );
  }
  const progress = ((currentStep + 1) / recipe.steps.length) * 100;

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-safe">
      {/* Offline/Cache Status Indicator */}
      {isFromCache && (
        <div className="flex items-center justify-between border-hairline border-b bg-muted/50 px-4 py-2 text-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">
                {isOnline ? "Cached Data" : "Offline Mode"}
              </span>
            </div>
            {!isOnline && (
              <span className="text-muted-foreground text-xs">
                Last synced{" "}
                {new Date(
                  Number.parseInt(
                    localStorage.getItem(`${CACHE_TIMESTAMP_KEY}${recipeId}`) ||
                      "0",
                    10
                  )
                ).toLocaleDateString()}
              </span>
            )}
          </div>
          {isOnline && (
            <Button
              className="h-7 text-xs"
              onClick={refreshRecipe}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh
            </Button>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="border-hairline border-b bg-background px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {currentStep + 1} of {recipe.steps.length}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
        </div>
        <Progress className="h-2" value={progress} />
      </div>

      <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="steps">
        <TabsList className="sticky top-[60px] z-40 flex w-full gap-1 bg-background p-1">
          <TabsTrigger
            className="rounded-full data-[state=active]:bg-ink data-[state=active]:text-white"
            value="steps"
          >
            Steps
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full data-[state=active]:bg-ink data-[state=active]:text-white"
            value="ingredients"
          >
            Ingredients
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full data-[state=active]:bg-ink data-[state=active]:text-white"
            value="info"
          >
            Info
          </TabsTrigger>
        </TabsList>

        {/* Steps Tab */}
        <TabsContent className="mt-0 px-4 py-6" value="steps">
          {/* Step Card */}
          <Card className="mb-4 overflow-hidden" tone="canvas">
            {currentStepData.imageUrl && (
              <AspectRatio ratio={16 / 9}>
                <Image
                  alt={`Step ${currentStepData.stepNumber}`}
                  className="object-cover"
                  fill
                  src={currentStepData.imageUrl}
                />
              </AspectRatio>
            )}

            <CardHeader className="space-y-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="flex-1 text-xl leading-tight">
                  {currentStepData.instruction}
                </CardTitle>
              </div>

              {currentStepData.tips && (
                <div className="flex gap-2 rounded-lg border border-hairline bg-muted/50 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                  <p className="text-foreground text-sm">
                    {currentStepData.tips}
                  </p>
                </div>
              )}

              {currentStepData.equipmentNeeded &&
                currentStepData.equipmentNeeded.length > 0 && (
                  <div className="flex gap-2 rounded-lg border border-hairline bg-pale-blue/50 p-3">
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-action-blue" />
                    <div className="text-ink text-sm">
                      <p className="font-medium">Equipment needed:</p>
                      <p className="text-muted-foreground">
                        {currentStepData.equipmentNeeded.join(", ")}
                      </p>
                    </div>
                  </div>
                )}

              {currentStepData.temperatureValue && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {currentStepData.temperatureValue}°
                    {currentStepData.temperatureUnit}
                  </Badge>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Timer Section */}
          {currentStepData.durationMinutes &&
            currentStepData.durationMinutes > 0 && (
              <Card className="mb-4" tone="canvas">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Timer className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Step Timer
                      </p>
                      <p className="font-bold text-2xl tabular-nums">
                        {timerSeconds > 0
                          ? formatTime(timerSeconds)
                          : formatMinutes(currentStepData.durationMinutes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {timerRunning ? (
                      <Button
                        className="h-14 w-14 rounded-full"
                        onClick={pauseTimer}
                        size="lg"
                        variant="outline"
                      >
                        <Pause className="h-6 w-6" />
                      </Button>
                    ) : (
                      <Button
                        className="h-14 w-14 rounded-full"
                        onClick={() =>
                          startTimer(currentStepData.durationMinutes!)
                        }
                        size="lg"
                        variant="default"
                      >
                        <Play className="h-6 w-6" />
                      </Button>
                    )}
                    {timerSeconds > 0 && timerSeconds !== initialTime && (
                      <Button
                        className="h-14 w-14 rounded-full"
                        onClick={resetTimer}
                        size="lg"
                        variant="ghost"
                      >
                        <RotateCcw className="h-6 w-6" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Navigation Buttons - Large for hands-free use */}
          <div className="flex gap-4">
            <Button
              className="h-16 flex-1 text-lg"
              disabled={currentStep === 0}
              onClick={goToPrevStep}
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Previous
            </Button>
            <Button
              className="h-16 flex-1 text-lg"
              disabled={currentStep === recipe.steps.length - 1}
              onClick={goToNextStep}
            >
              Next
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </TabsContent>

        {/* Ingredients Tab */}
        <TabsContent className="mt-0 px-4 py-6" value="ingredients">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Ingredients</CardTitle>
                  {recipe.yieldQuantity && (
                    <p className="text-muted-foreground text-sm">
                      Scales {recipe.yieldQuantity} {recipe.yieldUnit || ""} →{" "}
                      {scaleQuantity(recipe.yieldQuantity, scaleFactor)}{" "}
                      {recipe.yieldUnit || ""}
                    </p>
                  )}
                </div>
                <Badge variant={scaleFactor === 1 ? "outline" : "default"}>
                  {scaleFactor}x
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Scaling Controls */}
              <div className="mb-6 space-y-3">
                <p className="text-muted-foreground text-sm">Scale Recipe:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1, 2, 3].map((scale) => (
                    <Button
                      className="h-10"
                      key={scale}
                      onClick={() => setScaleFactor(scale)}
                      variant={scaleFactor === scale ? "default" : "outline"}
                    >
                      {scale}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-3">
                {ingredients.map((ingredient) => (
                  <div
                    className="flex items-start justify-between rounded-lg border border-hairline p-3"
                    key={ingredient.id}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{ingredient.name}</p>
                      {ingredient.notes && (
                        <p className="text-muted-foreground text-sm">
                          {ingredient.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">
                        {scaleFactor === 1 ? (
                          <>
                            {ingredient.quantity} {ingredient.unitCode}
                          </>
                        ) : (
                          <>
                            <span className="mr-1 text-muted-foreground line-through">
                              {ingredient.quantity} {ingredient.unitCode}
                            </span>
                            <span className="text-primary">
                              {scaleQuantity(ingredient.quantity, scaleFactor)}{" "}
                              {ingredient.unitCode}
                            </span>
                          </>
                        )}
                      </p>
                      {ingredient.isOptional && (
                        <Badge className="mt-1 text-xs" variant="secondary">
                          Optional
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent className="mt-0 px-4 py-6" value="info">
          <Card>
            <CardHeader>
              <CardTitle>{recipe.recipeName}</CardTitle>
              {recipe.description && (
                <p className="text-muted-foreground">{recipe.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg border border-hairline p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-muted-foreground text-sm">Prep Time</p>
                    <p className="font-semibold">
                      {formatMinutes(recipe.prepTimeMinutes)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-hairline p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-muted-foreground text-sm">Cook Time</p>
                    <p className="font-semibold">
                      {formatMinutes(recipe.cookTimeMinutes)}
                    </p>
                  </div>
                </div>
              </div>

              {recipe.yieldQuantity && (
                <div className="rounded-lg border border-hairline p-4">
                  <p className="text-muted-foreground text-sm">Yield</p>
                  <p className="font-semibold text-lg">
                    {recipe.yieldQuantity} {recipe.yieldUnit || ""}
                  </p>
                </div>
              )}

              {recipe.totalDuration > 0 && (
                <div className="rounded-lg border border-hairline p-4">
                  <p className="text-muted-foreground text-sm">
                    Total Timed Steps
                  </p>
                  <p className="font-semibold text-lg">
                    {Math.floor(recipe.totalDuration / 60)}h{" "}
                    {recipe.totalDuration % 60}m
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
