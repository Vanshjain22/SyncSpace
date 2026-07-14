import { validate } from "@/middlewares/validate";
import { createCommentSchema } from "@syncspace/shared";

export const validateCreateComment = validate({ body: createCommentSchema });
