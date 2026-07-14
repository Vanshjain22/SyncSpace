import { validate } from "@/middlewares/validate";
import { inviteUserSchema } from "@syncspace/shared";

export const validateCreateInvite = validate({ body: inviteUserSchema });
