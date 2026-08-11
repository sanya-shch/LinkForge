import { Module } from "@nestjs/common";
import { LinksModule } from "../links/links.module";
import { QrController } from "./qr.controller";
import { QrService } from "./qr.service";

@Module({
  imports: [LinksModule],
  controllers: [QrController],
  providers: [QrService],
})
export class QrModule {}
