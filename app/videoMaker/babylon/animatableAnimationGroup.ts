import type { IAnimationKey, AnimationGroup, Animation } from "@babylonjs/core";
import type {
  NumberProperty,
  InspectableAnimation,
} from "~/videoMaker/interface";

export class AnimatableAnimationGroup implements InspectableAnimation {
  public get currentFrame(): number {
    return this._animationGroup.animatables.length === 0
      ? 0
      : this._animationGroup.animatables[0].masterFrame;
  }

  public set currentFrame(frame: number) {
    this._animationGroup.goToFrame(frame);
  }

  public getCurrentFrameProperty(): NumberProperty {
    return {
      key: "currentFrame",
      value: this.currentFrame,
    };
  }

  public get blendWeight(): number {
    return this._animationGroup.weight;
  }

  public set blendWeight(weight: number) {
    this._animationGroup.weight = weight;
  }

  public getBlendWeightProperty(): NumberProperty {
    return {
      key: "blendWeight",
      value: this.blendWeight,
    };
  }

  public get name(): string {
    return this._animationGroup.name;
  }

  public get id(): string | null {
    return this._id;
  }

  public set id(id: string) {
    this._id = id;
  }

  public get firstFrame(): number {
    return this._animationGroup.animatables.length === 0
      ? 0
      : this._animationGroup.animatables[0].fromFrame;
  }

  public get lastFrame(): number {
    return this._animationGroup.animatables.length === 0
      ? 0
      : this._animationGroup.animatables[0].toFrame;
  }

  public get animation(): Animation | null {
    return this._animation;
  }

  public set animation(animation: Animation | null) {
    this._animation = animation;
  }

  public get keys(): IAnimationKey[] | undefined {
    return this._animation?.getKeys();
  }

  public get weight(): number {
    return this._animationGroup.weight;
  }

  public set weight(weight: number) {
    this._animationGroup.weight = weight;
  }

  public get loopAnimation(): boolean {
    return this._animationGroup.loopAnimation;
  }

  public set loopAnimation(loopAnimation: boolean) {
    this._animationGroup.loopAnimation = loopAnimation;
  }

  public setCurrentFrameAndWriteToAnimation(frame: number) {
    this._animationGroup.goToFrame(frame);
    this._onCurrentFrameChanged(frame, this.animation);
  }

  private _animationGroup: AnimationGroup;
  private _id: string | null = null;
  private _animation: Animation | null = null;
  private _onCurrentFrameChanged: (
    currentFrame: number,
    animation: Animation | null
  ) => void = () => {};

  constructor(
    animationGroup: AnimationGroup,
    onCurrentFrameChanged: (
      currentFrame: number,
      animation: Animation | null
    ) => void
  ) {
    this._animationGroup = animationGroup;
    this._onCurrentFrameChanged = onCurrentFrameChanged;
    // this._animationGroup.normalize(this.firstFrame, this.lastFrame);
  }

  public getAnimationGroup(): AnimationGroup {
    return this._animationGroup;
  }

  public setAnimationGroup(animationGroup: AnimationGroup): void {
    this._animationGroup = animationGroup;
  }

  public dispose(): void {
    this._animationGroup.dispose();
  }

  public play(): void {
    this._animationGroup.play();
  }

  public pause(): void {
    this._animationGroup.pause();
  }

  public reset(): void {
    this._animationGroup.reset();
  }

  public stop(): void {
    this._animationGroup.stop();
  }
}
