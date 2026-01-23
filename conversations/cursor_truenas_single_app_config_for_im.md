# TrueNAS single app config for images
_Exported on 23/01/2026 at 17:15:11 GMT from Cursor (2.4.21)_

---

**User**

We need to now make sure that a truenas user can input one app config and get both the server and server manager images installed and running

---

**Cursor**

I'll explore the current TrueNAS config and server manager setup to understand how to unify them.

Let me check the server manager's Dockerfile and configuration.

Let me check the REST adapter and the state management to understand how the two services communicate.

Let me check how the server API plugin loads credentials and the entrypoint script.

