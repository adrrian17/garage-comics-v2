import { DurableObject } from "cloudflare:workers";

/** Makes the watermarked copies of one Download Link in its own container (story 32). */
export class Watermarker extends DurableObject {
  async prepare(downloadLinkId: string) {
    await this.ctx.storage.put("downloadLinkId", downloadLinkId);
  }

  override async alarm() {
    await this.ctx.storage.deleteAlarm();
  }
}
