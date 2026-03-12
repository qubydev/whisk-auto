import { LoginButtons } from "@/components/auth";
import Image from "next/image";

export default function LogIn() {
    return (
        <main className="min-h-screen w-full flex bg-background">
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <Image
                    src="/bg2.png"
                    alt="Abstract background"
                    fill
                    className="object-cover opacity-60"
                    priority
                />

                <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-transparent to-background/40" />

                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                    }}
                />

                <div className="absolute top-10 left-10 z-10">
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={100}
                        height={100}
                        className="size-18"
                        priority
                    />
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">

                    <div className="flex lg:hidden mb-10">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={100}
                            height={100}
                            className="size-18"
                            priority
                        />
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-semibold tracking-tight mb-2">
                            Whisk Auto
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Sign in to continue to your workspace
                        </p>
                    </div>

                    <div className="space-y-3">
                        <LoginButtons />
                    </div>

                    <p className="text-center text-muted-foreground/60 text-xs leading-relaxed mt-2">
                        By continuing, you agree to our{" "}
                        <a
                            href="#"
                            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                        >
                            Terms of Service
                        </a>{" "}
                        <br />
                        and{" "}
                        <a
                            href="#"
                            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                        >
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </main>
    );
}