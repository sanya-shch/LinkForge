import { Injectable } from "@nestjs/common";
import * as QRCode from "qrcode";

export type QrFormat = "png" | "svg";

const QR_OPTIONS_PNG: QRCode.QRCodeToBufferOptions = {
  type: "png",
  margin: 1,
  width: 300,
};

const QR_OPTIONS_SVG: QRCode.QRCodeToStringOptions = {
  type: "svg",
  margin: 1,
};

@Injectable()
export class QrService {
  async generate(text: string, format: QrFormat): Promise<Buffer | string> {
    if (format === "svg") {
      return QRCode.toString(text, QR_OPTIONS_SVG);
    }

    return QRCode.toBuffer(text, QR_OPTIONS_PNG);
  }
}
