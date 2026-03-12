"use client";

import { authClient } from "@/lib/auth-client";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";

export function LoginButtons() {
    return (
        <div className="space-y-3">
            <Button
                className="w-full py-6"
                onClick={() => authClient.signIn.social({ provider: "github" })}
            >
                <FaGithub size={16} />
                <span>Continue with GitHub</span>
            </Button>
            <Button
                className="w-full py-6"
                onClick={() => authClient.signIn.social({ provider: "google" })}
            >
                <FcGoogle size={16} />
                <span>Continue with Google</span>
            </Button>
        </div>
    );
}