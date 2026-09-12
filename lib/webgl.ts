interface CanvasLike {
  getContext: (contextId: "webgl" | "experimental-webgl") => unknown;
}

type CanvasFactory = () => CanvasLike | null;

const defaultCanvasFactory: CanvasFactory = () => {
  if (typeof document === "undefined") {
    return null;
  }

  return document.createElement("canvas");
};

export function isWebGLSupported(
  createCanvas: CanvasFactory = defaultCanvasFactory,
): boolean {
  try {
    const canvas = createCanvas();
    if (!canvas) {
      return false;
    }

    const webglContext = canvas.getContext("webgl");
    if (webglContext) {
      return true;
    }

    return Boolean(canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}
