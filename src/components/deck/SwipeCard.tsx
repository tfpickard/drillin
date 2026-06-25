"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { ProfileCard } from "@/components/ProfileCard";

const THRESHOLD = 110;

/**
 * One draggable card. The swipe feel is load-bearing (spec §1): drag with
 * rotation, decision overlays that fade in with intent, spring-out on release.
 */
export function SwipeCard({
  profile,
  active,
  onDecide,
}: {
  profile: Profile;
  active: boolean;
  onDecide: (direction: "right" | "left") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const connectOpacity = useTransform(x, [20, THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-THRESHOLD, -20], [1, 0]);
  const [leaving, setLeaving] = useState(false);

  function flyOut(direction: "right" | "left") {
    setLeaving(true);
    animate(x, direction === "right" ? 600 : -600, {
      duration: 0.28,
      onComplete: () => onDecide(direction),
    });
  }

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate }}
      drag={active && !leaving ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x > THRESHOLD || info.velocity.x > 600) flyOut("right");
        else if (info.offset.x < -THRESHOLD || info.velocity.x < -600) flyOut("left");
        else animate(x, 0, { type: "spring", stiffness: 300, damping: 28 });
      }}
      whileTap={{ cursor: "grabbing" }}
    >
      <Card className="relative h-full overflow-hidden">
        <ProfileCard profile={profile} />

        <motion.div
          style={{ opacity: connectOpacity }}
          className="pointer-events-none absolute right-4 top-20 rotate-[-12deg] rounded-md border-2 border-positive px-3 py-1 text-lg font-bold uppercase tracking-wide text-positive"
        >
          Connect
        </motion.div>
        <motion.div
          style={{ opacity: passOpacity }}
          className="pointer-events-none absolute left-4 top-20 rotate-[12deg] rounded-md border-2 border-critical px-3 py-1 text-lg font-bold uppercase tracking-wide text-critical"
        >
          Not a Fit
        </motion.div>
      </Card>
    </motion.div>
  );
}
