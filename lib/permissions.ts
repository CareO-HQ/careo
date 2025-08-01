import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements, // Include default organization permissions
  project: ["create", "share", "update", "delete"]
} as const;

const ac = createAccessControl(statement);

const member = ac.newRole({
  project: ["create"],
  ...memberAc.statements // Include default member permissions
});

const admin = ac.newRole({
  project: ["create", "update", "share"],
  ...adminAc.statements // Include default admin permissions
});

const owner = ac.newRole({
  project: ["create", "update", "delete"],
  ...ownerAc.statements // Include default owner permissions
});

export { member, admin, owner, ac, statement };
