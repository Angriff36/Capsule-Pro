"use client";

import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { ChevronLeft, ChevronRight, Clock, Info, Play, Pause, RotateCcw, Timer, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";

type RecipeStep = {
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  temperatureValue: number | null;
  temperatureUnit: string | null;
  equipmentNeeded: string[] | null;
  tips: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
};

type RecipeStepsResponse = {
  recipeId: string;
  recipeName: string;
  recipeVersionId: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  restTimeMinutes: number | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  steps: RecipeStep[];
  totalDuration: number;
};

type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unitCode: string;
  notes: string | null;
  isOptional: boolean;
  orderIndex: number;
};

type MobileRecipeClientProps = {
  recipeId: string;
  tenantId: string;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatMinutes = (minutes?: number | null): string => {
  if (!minutes || minutes <= 0) return "-";
  return `${minutes}m`;
};

export const MobileRecipeClient = ({ recipeId, tenantId }: MobileRecipeClientProps) => {
  const [recipe, setRecipe] = useState<RecipeStepsResponse | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [initialTime, setInitialTime] = useState(0);

  // Fetch recipe data
  useEffect(() => {
    const fetchRecipeData = async () => {
      try {
        setLoading(true);
        const [stepsRes, ingredientsRes] = await Promise.all([
          fetch(`/api/kitchen/recipes/${recipeId}/steps`),
          fetch(`/api/kitchen/recipes/${recipeId}/ingredients`),
        ]);

        if (!stepsRes.ok || !ingredientsRes.ok) {
          throw new Error("Failed to fetch recipe data");
        }

        const [stepsData, ingredientsData] = await Promise.all([
          stepsRes.json() as Promise<RecipeStepsResponse>,
          ingredientsRes.json() as Promise<{ ingredients: RecipeIngredient[] }>,
        ]);

        setRecipe(stepsData);
        setIngredients(ingredientsData.ingredients);
      } catch (error) {
        console.error("Error fetching recipe:", error);
        toast.error("Failed to load recipe");
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
            if ("Notification" in window && Notification.permission === "granted") {
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
      if (interval) clearInterval(interval);
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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground mt-4 text-sm">Loading recipe...</p>
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
  const progress = ((currentStep + 1) / recipe.steps.length) * 100;

  return (
    <div className="flex min-h-screen flex-col pb-safe">
      {/* Progress Bar */}
      <div className="border-b bg-background px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Step {currentStep + 1} of {recipe.steps.length}</span>
          <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Tabs defaultValue="steps" className="flex-1">
        <TabsList className="sticky top-[60px] z-40 grid w-full grid-cols-3 rounded-none border-b bg-background">
          <TabsTrigger value="steps" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Steps
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Ingredients
          </TabsTrigger>
          <TabsTrigger value="info" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Info
          </TabsTrigger>
        </TabsList>

        {/* Steps Tab */}
        <TabsContent value="steps" className="mt-0 px-4 py-6">
          {/* Step Card */}
          <Card className="mb-4 overflow-hidden">
            {currentStepData.imageUrl && (
              <AspectRatio ratio={16 / 9}>
                <Image
                  src={currentStepData.imageUrl}
                  alt={`Step ${currentStepData.stepNumber}`}
                  fill
                  className="object-cover"
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
                <div className="flex gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {currentStepData.tips}
                  </p>
                </div>
              )}

              {currentStepData.equipmentNeeded && currentStepData.equipmentNeeded.length > 0 && (
                <div className="flex gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-500" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Equipment needed:</p>
                    <p className="text-blue-700 dark:text-blue-300">{currentStepData.equipmentNeeded.join(", ")}</p>
                  </div>
                </div>
              )}

              {currentStepData.temperatureValue && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {currentStepData.temperatureValue}°{currentStepData.temperatureUnit}
                  </Badge>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Timer Section */}
          {currentStepData.durationMinutes && currentStepData.durationMinutes > 0 && (
            <Card className="mb-4">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Timer className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Step Timer</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {timerSeconds > 0 ? formatTime(timerSeconds) : formatMinutes(currentStepData.durationMinutes)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!timerRunning ? (
                    <Button
                      size="lg"
                      className="h-14 w-14 rounded-full"
                      onClick={() => startTimer(currentStepData.durationMinutes!)}
                      variant="default"
                    >
                      <Play className="h-6 w-6" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="h-14 w-14 rounded-full"
                      onClick={pauseTimer}
                      variant="outline"
                    >
                      <Pause className="h-6 w-6" />
                    </Button>
                  )}
                  {timerSeconds > 0 && timerSeconds !== initialTime && (
                    <Button
                      size="lg"
                      className="h-14 w-14 rounded-full"
                      onClick={resetTimer}
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
              className="flex-1 h-16 text-lg"
              disabled={currentStep === 0}
              onClick={goToPrevStep}
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Previous
            </Button>
            <Button
              className="flex-1 h-16 text-lg"
              disabled={currentStep === recipe.steps.length - 1}
              onClick={goToNextStep}
            >
              Next
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </TabsContent>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients" className="mt-0 px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{ingredient.name}</p>
                      {ingredient.notes && (
                        <p className="text-muted-foreground text-sm">{ingredient.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">
                        {ingredient.quantity} {ingredient.unitCode}
                      </p>
                      {ingredient.isOptional && (
                        <Badge variant="secondary" className="mt-1 text-xs">Optional</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-0 px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>{recipe.recipeName}</CardTitle>
              {recipe.description && (
                <p className="text-muted-foreground">{recipe.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prep Time</p>
                    <p className="font-semibold">{formatMinutes(recipe.prepTimeMinutes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cook Time</p>
                    <p className="font-semibold">{formatMinutes(recipe.cookTimeMinutes)}</p>
                  </div>
                </div>
              </div>

              {recipe.yieldQuantity && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Yield</p>
                  <p className="text-lg font-semibold">
                    {recipe.yieldQuantity} {recipe.yieldUnit || ""}
                  </p>
                </div>
              )}

              {recipe.totalDuration > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Timed Steps</p>
                  <p className="text-lg font-semibold">
                    {Math.floor(recipe.totalDuration / 60)}h {recipe.totalDuration % 60}m
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
