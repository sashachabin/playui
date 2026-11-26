/**
 * Keyboard handlers in App, HomeScreen and the page/sidebar controls ignore
 * shortcuts while a dialog is open. Both UI layers have to be detectable here:
 * the classic layer renders `.modal`, the Kontur layer renders `.k-modal`.
 */
export function dialogIsOpen(): boolean {
  return document.querySelector(".modal, .k-modal") !== null;
}
