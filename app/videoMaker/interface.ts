// TODO: Properties that can be animated should have a separate type

// TODO: Maybe simplify the interfaces.
// There could only be an Inspectable interface for objects whose properties (list of different property and animated property types) can be modified and optionally be listed in the heirarchy.

export interface IVideoMaker {
  /**
   * The list of standalone `Inspectable` objects in the scene.
   */
  sceneInspectables: Inspectable[];

  /**
   * Gets the `Inspectable` with the given id.
   * @param id The id of the `Inspectable` to get.
   * @returns The `Inspectable` with the given id, or `null` if it does not exist.
   */
  getInspectableById: (id: string) => Inspectable | null;

  /**
   * Plays the story board animation of the current scene.
   */
  PlayStoryBoardAnimation: () => void;

  /**
   * Gets the current scene settings.
   * @returns The current scene settings, or `null` if there are no scene settings.
   */
  getSceneSettings: () => SceneSettings | null;

  /**
   * Sets the scene settings.
   * @param sceneSettings The scene settings to set.
   */
  setSceneSettings: (sceneSettings: Partial<SceneSettings>) => void;

  /**
   * Attaches the gizmo manager to the given node.
   * @param inspectable The `Inspectable` to select. If possible the gizmo manager will be attached to.
   */
  selectInspectable: (inspectable: Inspectable) => void;

  /**
   * Deletes the `Inspectable` that is currently selected.
   */
  deleteInspectable: () => void;

  /**
   * Serializes the scene to a file and saves it to disk.
   */
  saveScene: () => void;

  /**
   * Loads a file from disk and deserializes the scene from a file.
   */
  loadScene: () => void;

  /**
   * Sets the property of the inspectable.
   * @param inspectable The inspectable to set the property on.
   * @param property The property to set.
   */
  setInspectableProperty: (
    inspectable: Inspectable,
    property:
      | BooleanProperty
      | NumberProperty
      | ColourProperty
      | TextureProperty
      | Vector3Property
  ) => void;

  /**
   * Adds a new primitive mesh to the scene.
   */
  addPrimitiveMesh: () => void;

  /**
   * Imports a GLB model to the scene.
   */
  importGLBModel: () => void;
}

/**
 * These items can be selected and their details are displayed in the inspector.
 */
export interface Inspectable {
  id: string | null;
  name: string;
}

export interface InspectableMesh extends Inspectable {
  getPositionProperty: () => Vector3Property;
  getRotationProperty: () => Vector3Property;
  getScalingPropery: () => Vector3Property;
  getInspectableAnimations?: () => InspectableAnimation[] | null;
  getInspectableMeshMaterial?: () => InspectableMeshMaterial | null;
}

export const isInspectableMesh = (
  inspectable: Inspectable
): inspectable is InspectableMesh =>
  (inspectable as InspectableMesh).getPositionProperty !== undefined;

export interface InspectableAnimation extends Inspectable {
  firstFrame: number;
  lastFrame: number;
  getCurrentFrameProperty: () => NumberProperty;
  getBlendWeightProperty: () => NumberProperty;
}

export const isInspectableAnimation = (
  inspectable: Inspectable
): inspectable is InspectableAnimation =>
  (inspectable as InspectableAnimation).getCurrentFrameProperty !== undefined;

export interface InspectableMeshMaterial extends Inspectable {
  getMaterialProperties: () => (
    | BooleanProperty
    | NumberProperty
    | ColourProperty
    | TextureProperty
  )[];
}

export const isInspectableMeshMaterial = (
  inspectable: Inspectable
): inspectable is InspectableMeshMaterial =>
  (inspectable as InspectableMeshMaterial).getMaterialProperties !== undefined;

export type Vector3Property = {
  key: string;
  value: [number, number, number];
};

export const isVector3Property = (
  property:
    | BooleanProperty
    | NumberProperty
    | ColourProperty
    | TextureProperty
    | Vector3Property
): property is Vector3Property =>
  Array.isArray(property.value) && property.value.length === 3;

export type BooleanProperty = {
  key: string;
  value: boolean;
};

export const isBooleanProperty = (
  property:
    | BooleanProperty
    | NumberProperty
    | ColourProperty
    | TextureProperty
    | Vector3Property
): property is BooleanProperty => typeof property.value === "boolean";

export type NumberProperty = {
  key: string;
  value: number;
};

export const isNumberProperty = (
  property:
    | BooleanProperty
    | NumberProperty
    | ColourProperty
    | TextureProperty
    | Vector3Property
): property is NumberProperty => typeof property.value === "number";

// Value is a hex string
export type ColourProperty = {
  key: string;
  value: string;
  isColorProperty: boolean;
};

export const isColourProperty = (
  property:
    | BooleanProperty
    | NumberProperty
    | ColourProperty
    | TextureProperty
    | Vector3Property
): property is ColourProperty =>
  typeof property.value === "string" &&
  "isColorProperty" in property &&
  property.isColorProperty === true;

// Value is a string representing the URL of the texture
export type TextureProperty = {
  key: string;
  value: string | null;
  isTextureProperty: boolean;
};

export const isTextureProperty = (
  property:
    | BooleanProperty
    | NumberProperty
    | ColourProperty
    | TextureProperty
    | Vector3Property
): property is TextureProperty =>
  "isTextureProperty" in property && property.isTextureProperty === true;

export interface SceneSettings {
  transformGizmoMode: TransformGizmoMode;
  newPrimitiveMeshType: PrimitiveMeshType;
  currentBoardIndex: number; // Corresponds to the indices in the keyframes array
  selectedItemID: string | null;
}

export type TransformGizmoMode = "position" | "rotation" | "scale";
export type PrimitiveMeshType =
  | "box"
  | "sphere"
  | "cylinder"
  | "torus"
  | "plane"
  | "ground";
