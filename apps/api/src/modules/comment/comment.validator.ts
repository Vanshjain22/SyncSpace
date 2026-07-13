import { createCommentSchema } from "@syncspace/shared";

import { validate } from "@/middlewares/validate";

export const validateCreateComment = validate({ body: createCommentSchema });
