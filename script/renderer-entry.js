import { blobatar } from "blobatar/blob";
import * as expressions from "blobatar/expression";

export function render(name, options = {}) {
  const { expression = "idle", backgroundColor, ...rest } = options;
  if (backgroundColor) rest.palette = { bg: backgroundColor, ...rest.palette };
  return blobatar(name, { ...rest, expression: expressions[expression] });
}
