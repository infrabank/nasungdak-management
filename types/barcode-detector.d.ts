/**
 * Web BarcodeDetector API 타입 선언
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
 */

interface DetectedBarcode {
  readonly rawValue: string
  readonly format: string
  readonly boundingBox: DOMRectReadOnly
  readonly cornerPoints: ReadonlyArray<{ x: number; y: number }>
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
  static getSupportedFormats(): Promise<string[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}
