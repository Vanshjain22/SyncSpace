import { inviteUserSchema } from "@syncspace/shared";

import { validate } from "@/middlewares/validate";

export const validateCreateInvite = validate({ body: inviteUserSchema });
