import BlobatarController from "blobatar-rails/controller";
import { update } from "blobatar-rails/validation";

export { renderSVG } from "blobatar-rails/render";
export { BlobatarController };

export function registerBlobatar(application, turbo = globalThis.Turbo) {
  application.register("blobatar", BlobatarController);
  if (!turbo?.StreamActions) throw new Error("Import @hotwired/turbo-rails before registerBlobatar");
  turbo.StreamActions.blobatar_update = function () {
    const payload = update(JSON.parse(this.templateContent.textContent));
    for (const element of this.targetElements) {
      element.dispatchEvent(new CustomEvent("blobatar:update", { detail: payload }));
    }
  };
}
