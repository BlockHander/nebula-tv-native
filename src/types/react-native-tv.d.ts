// ─────────────────────────────────────────────────
// Nebula TV — React Native TV Type Augmentations
// Adds types for Android TV / Apple TV specific props
// that are available at runtime but missing from
// the standard @types/react-native.
// ─────────────────────────────────────────────────

import 'react-native'

declare module 'react-native' {
  interface TouchableOpacityProps {
    /**
     * Android TV / Apple TV: 3D parallax effect when focused.
     */
    tvParallaxProperties?: {
      enabled?: boolean
      shiftDistanceX?: number
      shiftDistanceY?: number
      tiltAngle?: number
      magnification?: number
      pressMagnification?: number
      pressDuration?: number
      pressDelay?: number
    }
    /**
     * Android TV: Whether this view should receive focus on load.
     */
    hasTVPreferredFocus?: boolean
    /**
     * Android TV: Next focus target for D-pad navigation.
     */
    nextFocusDown?: number | string
    nextFocusUp?: number | string
    nextFocusLeft?: number | string
    nextFocusRight?: number | string
  }

  interface ViewProps {
    /**
     * Android TV: Whether this view can receive TV focus.
     */
    isTVSelectable?: boolean
  }

  interface TextInputProps {
    /**
     * Android TV: Whether this input should receive focus on load.
     */
    hasTVPreferredFocus?: boolean
  }
}
