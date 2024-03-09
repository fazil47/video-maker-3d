import type { Observable } from "@babylonjs/core";

import type {
  InspectableMeshMaterial,
  Vector3Property,
} from "~/videoMaker/interface";

import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";

declare module "@babylonjs/core/meshes/abstractMesh" {
  interface AbstractMesh {
    onRotationChanged: Observable<void> | null;
    getPositionProperty: () => Vector3Property;
    getRotationProperty: () => Vector3Property;
    getScalingPropery: () => Vector3Property;
    getInspectableMeshMaterial: () => InspectableMeshMaterial | null;
  }
}

/**
 * Implement the `InspectableMesh` interface for the `AbstractMesh` class.
 */
export function implInspectableMeshForAbstractMesh() {
  AbstractMesh.prototype.getPositionProperty = function () {
    return {
      key: "position",
      value: [this.position.x, this.position.y, this.position.z],
    };
  };

  AbstractMesh.prototype.getRotationProperty = function () {
    return {
      key: "rotation",
      value: [this.rotation.x, this.rotation.y, this.rotation.z],
    };
  };

  AbstractMesh.prototype.getScalingPropery = function () {
    return {
      key: "scaling",
      value: [this.scaling.x, this.scaling.y, this.scaling.z],
    };
  };

  AbstractMesh.prototype.getInspectableMeshMaterial = function () {
    if (!this.material) {
      return null;
    }

    if (this.material instanceof StandardMaterial) {
      return {
        id: this.material.id,
        name: this.material.name,
        getMaterialProperties: () => {
          if (!(this?.material instanceof StandardMaterial)) {
            throw new Error("Material is not a StandardMaterial");
          }

          const diffuseTextureURL =
            this.material.diffuseTexture?.getInternalTexture()?.url || null;

          return [
            {
              key: "diffuseColor",
              value: this.material.diffuseColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "diffuseTexture",
              value: diffuseTextureURL,
              isTextureProperty: true,
            },
            {
              key: "emissiveColor",
              value: this.material.emissiveColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "specularColor",
              value: this.material.specularColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "ambientColor",
              value: this.material.ambientColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "alpha",
              value: this.material.alpha,
            },
            {
              key: "backFaceCulling",
              value: this.material.backFaceCulling,
              isBooleanProperty: true,
            },
            {
              key: "wireframe",
              value: this.material.wireframe,
              isBooleanProperty: true,
            },
          ];
        },
      };
    }

    if (this.material instanceof PBRMaterial) {
      return {
        id: this.material.id,
        name: this.material.name,
        getMaterialProperties: () => {
          if (!(this?.material instanceof PBRMaterial)) {
            throw new Error("Material is not a PBRMaterial");
          }

          const albedoTextureURL =
            this.material.albedoTexture?.getInternalTexture()?.url || null;

          return [
            {
              key: "albedoColor",
              value: this.material.albedoColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "albedoTexture",
              value: albedoTextureURL,
              isTextureProperty: true,
            },
            {
              key: "emissiveColor",
              value: this.material.emissiveColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "reflectivityColor",
              value: this.material.reflectivityColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "metallic",
              value: this.material.metallic || 0,
            },
            {
              key: "roughness",
              value: this.material.roughness || 0,
            },
            {
              key: "ambientColor",
              value: this.material.ambientColor.toHexString(),
              isColorProperty: true,
            },
            {
              key: "alpha",
              value: this.material.alpha,
            },
            {
              key: "backFaceCulling",
              value: this.material.backFaceCulling,
              isBooleanProperty: true,
            },
            {
              key: "wireframe",
              value: this.material.wireframe,
              isBooleanProperty: true,
            },
          ];
        },
      };
    }

    return null;
  };
}
