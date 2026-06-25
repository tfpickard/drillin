"use client";

import { motion } from "framer-motion";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";

/**
 * Double opt-in result, in corporate voice (spec §6). Sincere to the end.
 */
export function MatchScreen({
  them,
  onMessage,
  onDismiss,
}: {
  them: Profile;
  onMessage: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 grid place-items-center rounded-[var(--radius-card)] bg-brand/95 px-6 text-center text-white backdrop-blur"
    >
      <motion.div
        initial={{ scale: 0.92, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="flex flex-col items-center gap-4"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          Mutual Connection
        </p>
        <h2 className="text-2xl font-bold">It&rsquo;s a Match.</h2>
        <div className="flex items-center gap-3">
          <Avatar name="You" hue={210} size={56} className="ring-2 ring-white/70" />
          <Avatar name={them.displayName} hue={them.avatarHue} size={56} className="ring-2 ring-white/70" />
        </div>
        <p className="max-w-xs text-sm text-white/90">
          You both want to <em>&ldquo;take this conversation offline.&rdquo;</em>
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            onClick={onMessage}
            className="border-white bg-white text-brand hover:bg-white/90"
          >
            Open a Thread
          </Button>
          <button onClick={onDismiss} className="text-sm text-white/80 hover:underline">
            Keep sourcing
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
