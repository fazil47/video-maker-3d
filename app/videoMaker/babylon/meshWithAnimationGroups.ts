import type {
  Quaternion,
  Vector3,
  AbstractMesh,
  Animation,
} from "@babylonjs/core";

import type {
  InspectableAnimation,
  InspectableMesh,
  Vector3Property,
} from "~/videoMaker/interface";
import type { AnimatableAnimationGroup } from "./animatableAnimationGroup";

export class MeshWithAnimationGroups implements InspectableMesh {
  public get name(): string {
    return this._mesh.name;
  }

  public get mesh(): AbstractMesh {
    return this._mesh;
  }

  public get position(): Vector3 {
    return this._mesh.position;
  }

  public set position(position: Vector3) {
    this._mesh.position = position;
  }

  public get rotationQuaternion(): Quaternion | null {
    return this._mesh.rotationQuaternion;
  }

  public set rotationQuaternion(rotationQuaternion: Quaternion | null) {
    this._mesh.rotationQuaternion = rotationQuaternion;
  }

  public get scaling(): Vector3 {
    return this._mesh.scaling;
  }

  public set scaling(scaling: Vector3) {
    this._mesh.scaling = scaling;
  }

  public get animations(): Animation[] {
    return this._mesh.animations;
  }

  public set animations(animations: Animation[]) {
    this._mesh.animations = animations;
  }

  public getPositionProperty(): Vector3Property {
    return {
      key: "position",
      value: [
        this._mesh.position.x,
        this._mesh.position.y,
        this._mesh.position.z,
      ],
    };
  }

  public getRotationProperty(): Vector3Property {
    return {
      key: "rotation",
      value: [
        this._mesh.rotation.x,
        this._mesh.rotation.y,
        this._mesh.rotation.z,
      ],
    };
  }

  public getScalingPropery(): Vector3Property {
    return {
      key: "scaling",
      value: [this._mesh.scaling.x, this._mesh.scaling.y, this._mesh.scaling.z],
    };
  }

  public getInspectableMeshMaterial() {
    return null; // MeshWithAnimationGroups shouldn't expose its material
  }

  public getInspectableAnimations(): InspectableAnimation[] {
    return this._animationGroups;
  }

  public get animationGroups(): AnimatableAnimationGroup[] {
    return this._animationGroups;
  }

  public get id(): string {
    return this._mesh.id;
  }

  public set id(id: string) {
    this._mesh.id = id;
  }

  public dispose() {
    this._animationGroups.forEach((animationGroup) => animationGroup.dispose());
    this._mesh.dispose();
  }

  private _mesh: AbstractMesh;
  private _animationGroups: AnimatableAnimationGroup[];

  constructor(mesh: AbstractMesh, animationGroups: AnimatableAnimationGroup[]) {
    this._mesh = mesh;
    this._animationGroups = animationGroups;
  }
}
