"use client";

import { Button, InlineError } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <InlineError
      title="Workspace view failed"
      message="Kira could not finish rendering this view. No approval, payment, booking, or supplier action was taken."
      action={
        <Button variant="primary" icon="spark" onClick={reset}>
          Retry
        </Button>
      }
    />
  );
}
