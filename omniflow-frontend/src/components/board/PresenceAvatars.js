/**
 * PresenceAvatars.js — Live "Who's on this board" indicator
 *
 * WHAT THIS COMPONENT DOES:
 *   Reads the `presence` array from socketStore and renders a row of
 *   overlapping circular avatars showing every user currently viewing
 *   the same board in real time.
 *
 * DESIGN DECISIONS:
 *
 * 1. Why overlapping avatars (not a list)?
 *    Overlapping circles (with negative margin) is the compact, industry-standard
 *    pattern used by Figma, Notion, Linear, and GitHub for showing presence.
 *    It communicates "team" at a glance without taking up horizontal space.
 *
 * 2. Initials fallback:
 *    If a user has no avatar image URL, we show colored initials.
 *    The color is deterministic (derived from the user's name hash in socket.server.js)
 *    so the same user always appears in the same color.
 *
 * 3. +N overflow badge:
 *    If more than MAX_VISIBLE users are on the board, we show "+N" to
 *    indicate additional users without overwhelming the UI.
 *    MAX_VISIBLE = 5 — enough to see who's there, small enough to not crowd the header.
 *
 * 4. Pulse animation on the connection dot:
 *    A pulsing green dot in the top-right corner of the first avatar signals
 *    an active live connection — the same pattern Slack and Discord use.
 *
 * 5. Tooltip on hover:
 *    Shows the user's full name on hover. CSS-only tooltip (no library needed
 *    for this level of complexity). Accessible via title attribute as a fallback.
 *
 * PROPS:
 *   None — reads directly from useSocketStore (which reads from the singleton socket)
 *
 * CSS CLASSES (defined in globals.css):
 *   .presence-bar         — flex container for the avatar row
 *   .presence-avatar      — individual avatar circle
 *   .presence-avatar img  — avatar image
 *   .presence-initials    — colored initials fallback
 *   .presence-overflow    — "+N more" circle
 *   .presence-dot         — pulsing green connection indicator
 */

'use client';

import { useSocketStore } from '@/store/socketStore';

const MAX_VISIBLE = 5; // Show at most 5 avatars before the +N overflow badge

export default function PresenceAvatars() {
  const presence = useSocketStore((state) => state.presence);
  const isConnected = useSocketStore((state) => state.isConnected);

  // Don't render at all if no one is online (or socket isn't connected yet)
  if (!isConnected || presence.length === 0) {
    return null;
  }

  const visible = presence.slice(0, MAX_VISIBLE);
  const overflowCount = presence.length - MAX_VISIBLE;

  return (
    <div className="presence-bar" aria-label={`${presence.length} user${presence.length !== 1 ? 's' : ''} currently viewing this board`}>

      {/* Live indicator — pulsing dot shows WebSocket is active */}
      <div className="presence-live-indicator" title="Live sync active">
        <span className="presence-dot" />
        <span className="presence-live-label">Live</span>
      </div>

      {/* Avatar stack */}
      <div className="presence-avatars-stack">
        {visible.map((user, index) => (
          <div
            key={user.userId + index}
            className="presence-avatar"
            title={user.name}
            style={{
              // Stack avatars with negative margin (rightmost avatar on top via z-index)
              zIndex: MAX_VISIBLE - index,
              marginLeft: index === 0 ? '0' : '-8px',
            }}
            aria-label={user.name}
          >
            {user.avatar ? (
              // Real avatar image
              <img
                src={user.avatar}
                alt={user.name}
                className="presence-avatar-img"
                onError={(e) => {
                  // If image fails to load, fall back to initials
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}

            {/* Initials fallback — always rendered, hidden if image loads */}
            <span
              className="presence-initials"
              style={{
                backgroundColor: user.color,
                display: user.avatar ? 'none' : 'flex',
              }}
              aria-hidden="true"
            >
              {user.initials}
            </span>
          </div>
        ))}

        {/* +N overflow badge */}
        {overflowCount > 0 && (
          <div
            className="presence-avatar presence-overflow"
            title={`${overflowCount} more user${overflowCount !== 1 ? 's' : ''} viewing`}
            style={{ zIndex: 0, marginLeft: '-8px' }}
          >
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  );
}
