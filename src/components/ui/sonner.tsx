import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Every toast needs an unmistakable, high-contrast close
          // affordance — solid fill (inverted from the toast body) rather
          // than sonner's default subtle outline, so it always reads as
          // the obviously-safe action distinct from any accent-colored CTA.
          closeButton:
            "group-[.toast]:!bg-foreground group-[.toast]:!text-background group-[.toast]:!border-foreground group-[.toast]:opacity-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
