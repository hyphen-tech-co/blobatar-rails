import "@hotwired/turbo-rails";
import { application } from "controllers/application";
import { registerBlobatar } from "blobatar-rails";
import DemoController from "demo";
registerBlobatar(application);
application.register("demo", DemoController);
