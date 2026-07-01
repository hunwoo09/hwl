// Mutable flags read by variant functions at animation time — NOT React state.
// Set the flag synchronously before calling navigate(); Framer resolves
// variant functions lazily (when the animation starts), so by then the flag is set.
export const transitionState = {
  fromList:         false,   // Hero → Work: slide both upward
  returnedFromList: false,   // Work → Hero: slide both downward
  navbarHandledExit: false,  // Navbar already covered screen — WipeTransition skips exit
}
