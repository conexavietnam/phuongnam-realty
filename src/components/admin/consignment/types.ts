// Helpers the dashboard hands to the consignment panels so they share its toasts and error alerts.
export interface AdminActions {
  attempt: (action: () => Promise<unknown>) => Promise<boolean>;
  notify: (message: string) => void;
  refresh: () => void;
}
