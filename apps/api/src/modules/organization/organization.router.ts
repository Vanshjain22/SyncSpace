import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

import {
  create,
  get,
  getBySlug,
  list,
  listMembers,
  remove,
  removeMember,
  update,
  updateMember,
} from "./organization.controller";
import {
  validateCreateOrganization,
  validateUpdateMemberRole,
  validateUpdateOrganization,
} from "./organization.validator";

const router = Router();

// Root org routes
router.post("/", authenticate, validateCreateOrganization, create);
router.get("/", authenticate, list);

// Specific lookup - order is important: mount slug route before id param route
router.get("/slug/:slug", authenticate, getBySlug);

router.get("/:id", authenticate, authorize(), get);
router.patch("/:id", authenticate, authorize("OWNER", "ADMIN"), validateUpdateOrganization, update);
router.delete("/:id", authenticate, authorize("OWNER"), remove);

// Members sub-routes
router.get("/:orgId/members", authenticate, authorize(), listMembers);
router.patch(
  "/:orgId/members/:id",
  authenticate,
  authorize("OWNER"),
  validateUpdateMemberRole,
  updateMember,
);
router.delete("/:orgId/members/:id", authenticate, authorize(), removeMember);

export { router as organizationRouter };
