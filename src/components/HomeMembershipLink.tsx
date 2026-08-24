import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export type HomeMembershipState = "loading" | "guest" | "authenticated";

interface HomeMembershipLinkProps extends Omit<ComponentProps<typeof Link>, "to" | "children"> {
  children: (state: HomeMembershipState) => ReactNode;
}

const HomeMembershipLink = ({ children, ...props }: HomeMembershipLinkProps) => {
  const { user, loading } = useAuth();
  const state: HomeMembershipState = loading ? "loading" : user ? "authenticated" : "guest";

  return (
    <Link
      {...props}
      to={state === "guest" ? "/auth?mode=signup" : "/join"}
      aria-busy={state === "loading" ? true : undefined}
      data-membership-state={state}
    >
      {children(state)}
    </Link>
  );
};

export default HomeMembershipLink;
