package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.hytale.api.dto.request.PermissionRequests.*;
import com.hytale.api.dto.response.ApiResponses.*;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import io.netty.handler.codec.http.FullHttpRequest;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.logging.Logger;

/**
 * Handler for /server/permissions endpoints.
 * Reads and writes permissions.json; uses /op commands for operator management.
 * <p>
 * Execution context: HTTP handlers run on Netty threads. We do not call Universe.getPlayer(name, NameMatching)
 * from here because that touches world state and throws when called from a non-world thread.
 * For Add/Remove OP we use UUID when available (PermissionsModule) or dispatch via server command (op add/remove).
 */
public final class PermissionsHandler {
    private static final Logger LOGGER = Logger.getLogger(PermissionsHandler.class.getName());
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final Path permissionsPath;
    private final AdminHandler adminHandler;

    public PermissionsHandler(Path serverRoot, AdminHandler adminHandler) {
        this.permissionsPath = serverRoot.resolve("permissions.json");
        this.adminHandler = adminHandler;
    }

    /**
     * GET /server/permissions - Full permissions data.
     */
    public String handleGetPermissions(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PERMISSIONS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PERMISSIONS_READ);
        }
        PermissionsDataResponse data = readPermissionsFile();
        return GSON.toJson(data);
    }

    /**
     * GET /server/permissions/groups - List all groups.
     */
    public String handleGetGroups(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PERMISSIONS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PERMISSIONS_READ);
        }
        PermissionsDataResponse data = readPermissionsFile();
        List<GroupResponse> list = data.groups().entrySet().stream()
                .map(e -> new GroupResponse(e.getKey(), e.getValue().permissions() != null ? e.getValue().permissions() : List.of()))
                .toList();
        return GSON.toJson(list);
    }

    /**
     * POST /server/permissions/groups - Create new group.
     */
    public String handleCreateGroup(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PERMISSIONS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PERMISSIONS_WRITE);
        }
        String body = request.content().toString(StandardCharsets.UTF_8);
        CreateGroupRequest req = GSON.fromJson(body, CreateGroupRequest.class);
        if (req == null || !req.isValid()) {
            throw ApiException.BadRequest.missingField("name");
        }
        String name = req.name().trim();
        if (name.equalsIgnoreCase("op")) {
            throw ApiException.BadRequest.invalidField("name", "Use Operators section or /op for op group");
        }
        PermissionsDataResponse data = readPermissionsFile();
        Map<String, PermissionsDataResponse.GroupEntry> groups = new LinkedHashMap<>(data.groups());
        if (groups.containsKey(name)) {
            throw ApiException.BadRequest.invalidField("name", "Group already exists: " + name);
        }
        groups.put(name, new PermissionsDataResponse.GroupEntry(req.effectivePermissions()));
        writePermissionsFile(data.users(), groups);
        LOGGER.info("[API] Created group '%s' by %s".formatted(name, identity.clientId()));
        return GSON.toJson(new GroupResponse(name, req.effectivePermissions()));
    }

    /**
     * PUT /server/permissions/groups/{name} - Update group permissions.
     */
    public String handleUpdateGroup(FullHttpRequest request, ClientIdentity identity, String name) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PERMISSIONS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PERMISSIONS_WRITE);
        }
        if (name == null || name.isBlank()) {
            throw ApiException.BadRequest.missingField("name");
        }
        if (name.equalsIgnoreCase("op")) {
            throw ApiException.BadRequest.invalidField("name", "op group is managed via /op commands");
        }
        String body = request.content().toString(StandardCharsets.UTF_8);
        UpdateGroupRequest req = GSON.fromJson(body, UpdateGroupRequest.class);
        if (req == null) {
            throw ApiException.BadRequest.invalidJson("Invalid body");
        }
        PermissionsDataResponse data = readPermissionsFile();
        Map<String, PermissionsDataResponse.GroupEntry> groups = new LinkedHashMap<>(data.groups());
        if (!groups.containsKey(name)) {
            throw new ApiException.NotFound("GROUP_NOT_FOUND", "Group not found: " + name);
        }
        groups.put(name, new PermissionsDataResponse.GroupEntry(req.effectivePermissions()));
        writePermissionsFile(data.users(), groups);
        LOGGER.info("[API] Updated group '%s' by %s".formatted(name, identity.clientId()));
        return GSON.toJson(new GroupResponse(name, req.effectivePermissions()));
    }

    /**
     * DELETE /server/permissions/groups/{name} - Delete group.
     */
    public String handleDeleteGroup(FullHttpRequest request, ClientIdentity identity, String name) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PERMISSIONS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PERMISSIONS_WRITE);
        }
        if (name == null || name.isBlank()) {
            throw ApiException.BadRequest.missingField("name");
        }
        if (name.equalsIgnoreCase("op")) {
            throw ApiException.BadRequest.invalidField("name", "Cannot delete op group");
        }
        PermissionsDataResponse data = readPermissionsFile();
        Map<String, PermissionsDataResponse.GroupEntry> groups = new LinkedHashMap<>(data.groups());
        if (!groups.containsKey(name)) {
            throw new ApiException.NotFound("GROUP_NOT_FOUND", "Group not found: " + name);
        }
        groups.remove(name);
        Map<String, PermissionsDataResponse.UserEntry> users = new LinkedHashMap<>();
        for (Map.Entry<String, PermissionsDataResponse.UserEntry> e : data.users().entrySet()) {
            List<String> userGroups = e.getValue().groups() != null ? new ArrayList<>(e.getValue().groups()) : new ArrayList<>();
            userGroups.remove(name);
            users.put(e.getKey(), new PermissionsDataResponse.UserEntry(userGroups, e.getValue().permissions() != null ? e.getValue().permissions() : List.of()));
        }
        writePermissionsFile(users, groups);
        LOGGER.info("[API] Deleted group '%s' by %s".formatted(name, identity.clientId()));
        return GSON.toJson(SuccessResponse.ok("Group deleted: " + name));
    }

    /**
     * POST /server/permissions/op - Add player to OP group.
     * For UUID: uses PermissionsModule. For username: uses /op add command (avoids calling
     * Universe.getPlayer from HTTP thread, which causes "called async with player in world").
     */
    public String handleAddOp(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PERMISSIONS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PERMISSIONS_WRITE);
        }
        String body = request.content().toString(StandardCharsets.UTF_8);
        OpRequest req = GSON.fromJson(body, OpRequest.class);
        if (req == null || !req.isValid()) {
            throw ApiException.BadRequest.missingField("player");
        }
        String player = req.player().trim();

        // Only use PermissionsModule when we have a UUID (no Universe call from HTTP thread)
        UUID uuid = parseUuid(player);
        if (uuid != null) {
            try {
                PermissionsModule permissions = PermissionsModule.get();
                permissions.addUserToGroup(uuid, "OP");
                LOGGER.info("[API] Added %s (%s) to OP group by %s".formatted(player, uuid, identity.clientId()));
                return GSON.toJson(SuccessResponse.ok("Added " + player + " to operators"));
            } catch (Exception e) {
                LOGGER.warning("Failed to add OP via PermissionsModule: " + e.getMessage());
            }
        }
        // Username or PermissionsModule failed: use command (server resolves online player or returns error)
        String command = "op add " + player;
        return adminHandler.executeCommandUnchecked(command, identity);
    }

    /**
     * DELETE /server/permissions/op/{player} - Remove player from OP group.
     * For UUID: uses PermissionsModule. For username: uses /op remove command.
     */
    public String handleRemoveOp(FullHttpRequest request, ClientIdentity identity, String player) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PERMISSIONS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PERMISSIONS_WRITE);
        }
        if (player == null || player.isBlank()) {
            throw ApiException.BadRequest.missingField("player");
        }
        player = player.trim();

        UUID uuid = parseUuid(player);
        if (uuid != null) {
            try {
                PermissionsModule permissions = PermissionsModule.get();
                permissions.removeUserFromGroup(uuid, "OP");
                LOGGER.info("[API] Removed %s (%s) from OP group by %s".formatted(player, uuid, identity.clientId()));
                return GSON.toJson(SuccessResponse.ok("Removed " + player + " from operators"));
            } catch (Exception e) {
                LOGGER.warning("Failed to remove OP via PermissionsModule: " + e.getMessage());
            }
        }
        String command = "op remove " + player;
        return adminHandler.executeCommandUnchecked(command, identity);
    }

    /**
     * Parse identifier as UUID only. Does not call Universe (safe from HTTP thread).
     */
    private static UUID parseUuid(String identifier) {
        if (identifier == null || identifier.isBlank()) return null;
        try {
            return UUID.fromString(identifier.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Get full permissions data (for use by PlayerExtendedHandler).
     */
    public PermissionsDataResponse getPermissionsData() {
        return readPermissionsFile();
    }

    /**
     * Update a user's entry in permissions.json (for use by PlayerExtendedHandler).
     */
    public void updateUser(String uuid, PermissionsDataResponse.UserEntry entry) {
        PermissionsDataResponse data = readPermissionsFile();
        Map<String, PermissionsDataResponse.UserEntry> users = new LinkedHashMap<>(data.users());
        users.put(uuid, entry);
        writePermissionsFile(users, data.groups());
    }

    private PermissionsDataResponse readPermissionsFile() {
        if (!Files.exists(permissionsPath)) {
            return new PermissionsDataResponse(Map.of(), Map.of());
        }
        try {
            String content = Files.readString(permissionsPath);
            Type mapType = new TypeToken<Map<String, ?>>() {}.getType();
            Map<String, ?> root = GSON.fromJson(content, mapType);
            if (root == null) {
                return new PermissionsDataResponse(Map.of(), Map.of());
            }
            Map<String, PermissionsDataResponse.GroupEntry> groups = parseGroups(root.get("groups"));
            Map<String, PermissionsDataResponse.UserEntry> users = parseUsers(root.get("users"));
            return new PermissionsDataResponse(groups, users);
        } catch (Exception e) {
            LOGGER.warning("Failed to read permissions.json: " + e.getMessage());
            return new PermissionsDataResponse(Map.of(), Map.of());
        }
    }

    /**
     * Parse groups from permissions.json.
     * Supports both formats:
     * - Direct array: "OP": ["*"]
     * - Object with permissions: "OP": { "permissions": ["*"] }
     */
    @SuppressWarnings("unchecked")
    private Map<String, PermissionsDataResponse.GroupEntry> parseGroups(Object o) {
        if (o == null || !(o instanceof Map)) {
            return Map.of();
        }
        Map<String, ?> raw = (Map<String, ?>) o;
        Map<String, PermissionsDataResponse.GroupEntry> out = new LinkedHashMap<>();
        for (Map.Entry<String, ?> e : raw.entrySet()) {
            Object value = e.getValue();
            List<String> permissions;

            if (value instanceof List) {
                // Format: "OP": ["*"] - direct array of permissions
                permissions = (List<String>) value;
            } else if (value instanceof Map) {
                // Format: "OP": { "permissions": ["*"] } - object with permissions key
                Map<String, ?> groupMap = (Map<String, ?>) value;
                Object perms = groupMap.get("permissions");
                permissions = perms instanceof List ? (List<String>) perms : List.of();
            } else {
                // Unknown format, skip
                continue;
            }

            out.put(e.getKey(), new PermissionsDataResponse.GroupEntry(permissions != null ? permissions : List.of()));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private Map<String, PermissionsDataResponse.UserEntry> parseUsers(Object o) {
        if (o == null || !(o instanceof Map)) {
            return Map.of();
        }
        Map<String, ?> raw = (Map<String, ?>) o;
        Map<String, PermissionsDataResponse.UserEntry> out = new LinkedHashMap<>();
        for (Map.Entry<String, ?> e : raw.entrySet()) {
            if (!(e.getValue() instanceof Map)) continue;
            Map<String, ?> userMap = (Map<String, ?>) e.getValue();
            Object groupsObj = userMap.get("groups");
            Object permsObj = userMap.get("permissions");
            List<String> groups = groupsObj instanceof List ? (List<String>) groupsObj : List.of();
            List<String> perms = permsObj instanceof List ? (List<String>) permsObj : List.of();
            out.put(e.getKey(), new PermissionsDataResponse.UserEntry(groups != null ? groups : List.of(), perms != null ? perms : List.of()));
        }
        return out;
    }

    /**
     * Write permissions.json in Hytale-native format.
     * Uses direct arrays for groups: "OP": ["*"]
     * Uses objects for users with groups and permissions keys.
     */
    private void writePermissionsFile(Map<String, PermissionsDataResponse.UserEntry> users, Map<String, PermissionsDataResponse.GroupEntry> groups) {
        try {
            Map<String, Object> root = new LinkedHashMap<>();

            // Write groups as direct arrays (Hytale-native format)
            // Format: "OP": ["*"], "Default": [], "VIP": ["myplugin.vip.*"]
            Map<String, Object> groupsJson = new LinkedHashMap<>();
            for (Map.Entry<String, PermissionsDataResponse.GroupEntry> e : groups.entrySet()) {
                groupsJson.put(e.getKey(), e.getValue().permissions());
            }
            root.put("groups", groupsJson);

            // Write users with groups and permissions
            // Format: "uuid": { "groups": ["OP"], "permissions": ["extra.perm"] }
            Map<String, Object> usersJson = new LinkedHashMap<>();
            for (Map.Entry<String, PermissionsDataResponse.UserEntry> e : users.entrySet()) {
                Map<String, Object> userEntry = new LinkedHashMap<>();
                userEntry.put("groups", e.getValue().groups() != null ? e.getValue().groups() : List.of());
                List<String> perms = e.getValue().permissions();
                if (perms != null && !perms.isEmpty()) {
                    userEntry.put("permissions", perms);
                }
                usersJson.put(e.getKey(), userEntry);
            }
            root.put("users", usersJson);

            Files.createDirectories(permissionsPath.getParent());
            Files.writeString(permissionsPath, GSON.toJson(root));
        } catch (Exception e) {
            LOGGER.warning("Failed to write permissions.json: " + e.getMessage());
            throw new ApiException.InternalError("Failed to write permissions file: " + e.getMessage());
        }
    }
}
