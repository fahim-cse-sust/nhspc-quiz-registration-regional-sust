"use client";

import { Button } from "@/components/ui/button";

export function DeleteButton({
  id,
  action,
  label = "Delete",
  message = "Are you sure you want to delete this item?"
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
  message?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button variant="danger" type="submit" className="h-9 whitespace-nowrap px-3">
        {label}
      </Button>
    </form>
  );
}
