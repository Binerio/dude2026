import { findByProps } from "@vendetta/metro";
import { React, ReactNative as RN } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { registerCommand } from "@vendetta/commands";

const { View, Text, TextInput, Switch, ScrollView, TouchableOpacity, StyleSheet } = RN;

const FluxDispatcher = findByProps("dispatch", "subscribe");
const UserStore = findByProps("getUser", "getCurrentUser");
const SelectedChannelStore = findByProps("getChannelId", "getVoiceChannelId");

// ── defaults ──────────────────────────────────────────────────────────────────
storage.userId ??= "";
storage.message ??= "";
storage.useUTC ??= true;
storage.savedCount ??= 0;

const now = new Date();
storage.year ??= String(now.getFullYear());
storage.month ??= String(now.getMonth() + 1);
storage.day ??= String(now.getDate());
storage.hour ??= String(now.getHours());
storage.minute ??= String(now.getMinutes());

// ── core send logic ───────────────────────────────────────────────────────────
function sendFakeMessage() {
    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) {
        showToast("Open a channel first.", getAssetIDByName("Small"));
        return;
    }

    const rawId = storage.userId?.trim();
    const user = rawId
        ? UserStore.getUser(rawId)
        : UserStore.getCurrentUser();

    if (!user) {
        showToast(
            rawId ? `No cached user for ID: ${rawId}` : "Could not get current user.",
            getAssetIDByName("Small")
        );
        return;
    }

    const content = storage.message?.trim();
    if (!content) {
        showToast("Message cannot be empty.", getAssetIDByName("Small"));
        return;
    }

    // Build timestamp
    const y = parseInt(storage.year) || now.getFullYear();
    const mo = (parseInt(storage.month) || now.getMonth() + 1) - 1;
    const d = parseInt(storage.day) || now.getDate();
    const h = parseInt(storage.hour) || 0;
    const mi = parseInt(storage.minute) || 0;

    const ts = storage.useUTC
        ? new Date(Date.UTC(y, mo, d, h, mi)).toISOString()
        : new Date(y, mo, d, h, mi).toISOString();

    const message = {
        id: `fake-${Date.now()}`,
        channel_id: channelId,
        author: {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator ?? "0",
            avatar: user.avatar,
            bot: user.bot ?? false,
        },
        content,
        timestamp: ts,
        edited_timestamp: null,
        tts: false,
        mention_everyone: false,
        mentions: [],
        mention_roles: [],
        attachments: [],
        embeds: [],
        type: 0,
        flags: 64,
    };

    FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE",
        channelId,
        message,
        optimistic: false,
        isPushNotification: false,
    });

    storage.savedCount = (storage.savedCount ?? 0) + 1;
    showToast(`Fake message sent as ${user.username}`, getAssetIDByName("Check"));
}

// ── styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "#1e1f22" },
    sectionHeader: {
        fontSize: 12,
        fontWeight: "600",
        color: "#949ba4",
        letterSpacing: 0.5,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 6,
        textTransform: "uppercase",
    },
    card: {
        backgroundColor: "#2b2d31",
        marginHorizontal: 0,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "#3a3c40",
    },
    row: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "#3a3c40",
    },
    rowLast: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowLabel: { fontSize: 16, color: "#dbdee1", marginBottom: 2 },
    rowSub: { fontSize: 13, color: "#949ba4" },
    input: {
        fontSize: 15,
        color: "#dbdee1",
        marginTop: 4,
        paddingVertical: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "#444",
    },
    rowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "#3a3c40",
    },
    sendBtn: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    sendLabel: { fontSize: 16, color: "#dbdee1", fontWeight: "600" },
    sendSub: { fontSize: 13, color: "#949ba4", marginTop: 2 },
});

// ── settings page ─────────────────────────────────────────────────────────────
export function FakeMessagesSettings() {
    useProxy(storage);

    const padded = (v) => String(v ?? "").padStart(2, "0");
    const tsPreview = (() => {
        try {
            const y = storage.year || "????";
            const mo = padded(storage.month);
            const d = padded(storage.day);
            const h = padded(storage.hour);
            const mi = padded(storage.minute);
            return `${y}-${mo}-${d} ${h}:${mi}`;
        } catch {
            return "Invalid";
        }
    })();

    return (
        <ScrollView style={s.scroll}>
            {/* ── FAKE MESSAGE section ── */}
            <Text style={s.sectionHeader}>Fake Message</Text>
            <View style={s.card}>
                <View style={s.row}>
                    <Text style={s.rowLabel}>User ID (Optional)</Text>
                    <Text style={s.rowSub}>Leave empty to use current user</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Enter user ID"
                        placeholderTextColor="#5c5f65"
                        keyboardType="numeric"
                        value={storage.userId}
                        onChangeText={(v) => (storage.userId = v)}
                    />
                </View>
                <View style={s.rowLast}>
                    <Text style={s.rowLabel}>Message</Text>
                    <TextInput
                        style={[s.input, { minHeight: 36 }]}
                        placeholder="Enter message content"
                        placeholderTextColor="#5c5f65"
                        multiline
                        value={storage.message}
                        onChangeText={(v) => (storage.message = v)}
                    />
                </View>
            </View>

            {/* ── CUSTOM TIMESTAMP section ── */}
            <Text style={s.sectionHeader}>Custom Timestamp</Text>
            <View style={s.card}>
                {/* UTC toggle */}
                <View style={s.rowBetween}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.rowLabel}>Using UTC Time</Text>
                        <Text style={s.rowSub}>Time will be the same for everyone</Text>
                    </View>
                    <Switch
                        value={storage.useUTC}
                        onValueChange={(v) => (storage.useUTC = v)}
                        trackColor={{ true: "#5865f2", false: "#72767d" }}
                        thumbColor="#ffffff"
                    />
                </View>

                {/* Year */}
                <View style={s.row}>
                    <Text style={s.rowLabel}>Year</Text>
                    <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        value={storage.year}
                        onChangeText={(v) => (storage.year = v)}
                        placeholder={String(now.getFullYear())}
                        placeholderTextColor="#5c5f65"
                    />
                </View>

                {/* Month */}
                <View style={s.row}>
                    <Text style={s.rowLabel}>Month</Text>
                    <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        value={storage.month}
                        onChangeText={(v) => (storage.month = v)}
                        placeholder={String(now.getMonth() + 1)}
                        placeholderTextColor="#5c5f65"
                    />
                </View>

                {/* Day */}
                <View style={s.row}>
                    <Text style={s.rowLabel}>Day</Text>
                    <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        value={storage.day}
                        onChangeText={(v) => (storage.day = v)}
                        placeholder={String(now.getDate())}
                        placeholderTextColor="#5c5f65"
                    />
                </View>

                {/* Hour */}
                <View style={s.row}>
                    <Text style={s.rowLabel}>Hour</Text>
                    <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        value={storage.hour}
                        onChangeText={(v) => (storage.hour = v)}
                        placeholder={String(now.getHours())}
                        placeholderTextColor="#5c5f65"
                    />
                </View>

                {/* Minute */}
                <View style={s.row}>
                    <Text style={s.rowLabel}>Minute</Text>
                    <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        value={storage.minute}
                        onChangeText={(v) => (storage.minute = v)}
                        placeholder={String(now.getMinutes())}
                        placeholderTextColor="#5c5f65"
                    />
                </View>

                {/* Send button */}
                <TouchableOpacity style={s.sendBtn} onPress={sendFakeMessage}>
                    <Text style={s.sendLabel}>Send Fake Message</Text>
                    <Text style={s.sendSub}>
                        {storage.savedCount ?? 0} messages saved | Timestamp: {tsPreview}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

// ── plugin lifecycle ──────────────────────────────────────────────────────────
let commandUnpatch;

export default {
    onLoad() {
        commandUnpatch = registerCommand({
            name: "fakemsg",
            displayName: "fakemsg",
            description: "Send a local fake message (opens settings or quick-send)",
            displayDescription: "Send a fake local message",
            applicationId: "-1",
            inputType: 1,
            options: [
                {
                    name: "user_id",
                    displayName: "user_id",
                    description: "Discord user ID (optional, defaults to you)",
                    displayDescription: "Discord user ID",
                    type: 3,
                    required: false,
                },
                {
                    name: "message",
                    displayName: "message",
                    description: "Message content",
                    displayDescription: "Message content",
                    type: 3,
                    required: true,
                },
            ],
            execute(args) {
                const uid = args.find((a) => a.name === "user_id")?.value ?? "";
                const msg = args.find((a) => a.name === "message")?.value ?? "";
                const prev = { userId: storage.userId, message: storage.message };
                storage.userId = uid;
                storage.message = msg;
                sendFakeMessage();
                // restore previous values so the settings form isn't clobbered
                storage.userId = prev.userId;
                storage.message = prev.message;
            },
        });
    },

    onUnload() {
        commandUnpatch?.();
    },

    settings: FakeMessagesSettings,
};
