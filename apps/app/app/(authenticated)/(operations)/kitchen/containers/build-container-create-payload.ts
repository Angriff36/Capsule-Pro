/**
 * Builds a complete Container.create body for the Manifest Zod gate.
 * Empty optional fields become Manifest defaults ("" / 0), never omitted.
 */

export interface ContainerCreateFormInput {
  capacityPortions?: string;
  capacityVolumeMl?: string;
  capacityWeightG?: string;
  containerType: string;
  isReusable: boolean;
  name: string;
  sizeDescription?: string;
}

export interface ContainerCreatePayload {
  capacityPortions: number;
  capacityVolumeMl: number;
  capacityWeightG: number;
  containerType: string;
  isReusable: boolean;
  locationId: string;
  name: string;
  sizeDescription: string;
}

function parseNonNegativeNumber(
  raw: string | undefined,
  label: string
): number {
  if (raw === undefined || raw.trim() === "") {
    return 0;
  }
  const value = Number(raw);
  if (!(Number.isFinite(value) && value >= 0)) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return value;
}

export function buildContainerCreatePayload(
  input: ContainerCreateFormInput
): ContainerCreatePayload {
  const name = input.name.trim();
  const containerType = input.containerType.trim();
  if (!name) {
    throw new Error("Container name is required.");
  }
  if (!containerType) {
    throw new Error("Container type is required.");
  }

  return {
    name,
    containerType,
    locationId: "",
    sizeDescription: (input.sizeDescription ?? "").trim(),
    capacityVolumeMl: parseNonNegativeNumber(
      input.capacityVolumeMl,
      "Volume capacity"
    ),
    capacityWeightG: parseNonNegativeNumber(
      input.capacityWeightG,
      "Weight capacity"
    ),
    capacityPortions: parseNonNegativeNumber(
      input.capacityPortions,
      "Portion capacity"
    ),
    isReusable: input.isReusable,
  };
}
