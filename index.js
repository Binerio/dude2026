(function() {
    const vendetta = window.vendetta;

    const findByProps = vendetta.metro.findByProps;
    const React = vendetta.metro.common.React;
    const RN = vendetta.metro.common.ReactNative;
    const storage = vendetta.plugin.storage;
    const showToast = vendetta.ui.toasts.showToast;
    const getAssetIDByName = vendetta.ui.assets.getAssetIDByName;
    const registerCommand = vendetta.commands.registerCommand;

    const { View, Text, TextInput, Switch, ScrollView, TouchableOpacity, StyleSheet } = RN;

    const FluxDispatcher = findByProps("dispatch", "subscribe");
    const UserStore = findByProps("getUser", "getCurrentUser");
    const SelectedChannelStore = findByProps("getChannelId", "getVoiceChannelId");

    const now = new Date();

    storage.userId ??= "";
    storage.message ??= "";
    storage.useUTC ??= true;
    storage.savedCount ??= 0;
    storage.year ??= String(now.getFullYear());
    storage.month ??= String(now.getMonth() + 1);
    storage.day ??= String(now.getDate());
    storage.hour ??= String(now.getHours());
    storage.minute ??= String(now.getMinutes());

    function sendFakeMessage() {
        const channelId = SelectedChannelStore.getChannelId();
        if (!channelId) {
            showToast("Open a channel first.", getAssetIDByName("Small"));
            return;
        }

        const rawId = storage.userId?.trim();
        const user = rawId ? UserStore.getUser(rawId) : UserStore.getCurrentUser();

        if (!user) {
            showToast(rawId ? "No cached user for ID: " + rawId : "Could not get current user.", getAssetIDByName("Small"));
            return;
        }

        const content = storage.message?.trim();
        if (!content) {
            showToast("Message cannot be empty.", getAssetIDByName("Small"));
            return;
        }

        const y = parseInt(storage.year) || now.getFullYear();
        const mo = (parseInt(storage.month) || now.getMonth() + 1) - 1;
        const d = parseInt(storage.day) || now.getDate();
        const h = parseInt(storage.hour) || 0;
        const mi = parseInt(storage.minute) || 0;

        const ts = storage.useUTC
            ? new Date(Date.UTC(y, mo, d, h, mi)).toISOString()
            : new Date(y, mo, d, h, mi).toISOString();

        const message = {
            id: "fake-" + Date.now(),
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
        showToast("Fake message sent as " + user.username, getAssetIDByName("Check"));
    }

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
        rowLast: { paddingHorizontal: 16, paddingVertical: 14 },
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
        sendLabel: { fontSize: 16, color: "#dbdee1", fontWeight: "600" },
        sendSub: { fontSize: 13, color: "#949ba4", marginTop: 2 },
    });

    function FakeMessagesSettings() {
        const [, forceUpdate] = React.useReducer(function(x) { return x + 1; }, 0);

        function set(key, val) {
            storage[key] = val;
            forceUpdate();
        }

        function padded(v) { return String(v ?? "").padStart(2, "0"); }

        var tsPreview;
        try {
            tsPreview = (storage.year || "????") + "-" + padded(storage.month) + "-" + padded(storage.day) + " " + padded(storage.hour) + ":" + padded(storage.minute);
        } catch(e) { tsPreview = "Invalid"; }

        var fields = ["year", "month", "day", "hour", "minute"];

        return React.createElement(ScrollView, { style: s.scroll },
            React.createElement(Text, { style: s.sectionHeader }, "Fake Message"),
            React.createElement(View, { style: s.card },
                React.createElement(View, { style: s.row },
                    React.createElement(Text, { style: s.rowLabel }, "User ID (Optional)"),
                    React.createElement(Text, { style: s.rowSub }, "Leave empty to use current user"),
                    React.createElement(TextInput, {
                        style: s.input,
                        placeholder: "Enter user ID",
                        placeholderTextColor: "#5c5f65",
                        keyboardType: "numeric",
                        value: storage.userId,
                        onChangeText: function(v) { set("userId", v); },
                    })
                ),
                React.createElement(View, { style: s.rowLast },
                    React.createElement(Text, { style: s.rowLabel }, "Message"),
                    React.createElement(TextInput, {
                        style: [s.input, { minHeight: 36 }],
                        placeholder: "Enter message content",
                        placeholderTextColor: "#5c5f65",
                        multiline: true,
                        value: storage.message,
                        onChangeText: function(v) { set("message", v); },
                    })
                )
            ),

            React.createElement(Text, { style: s.sectionHeader }, "Custom Timestamp"),
            React.createElement(View, { style: s.card },
                React.createElement(View, { style: s.rowBetween },
                    React.createElement(View, { style: { flex: 1 } },
                        React.createElement(Text, { style: s.rowLabel }, "Using UTC Time"),
                        React.createElement(Text, { style: s.rowSub }, "Time will be the same for everyone")
                    ),
                    React.createElement(Switch, {
                        value: storage.useUTC,
                        onValueChange: function(v) { set("useUTC", v); },
                        trackColor: { true: "#5865f2", false: "#72767d" },
                        thumbColor: "#ffffff",
                    })
                ),
                React.createElement(View, { style: s.row },
                    React.createElement(Text, { style: s.rowLabel }, "Year"),
                    React.createElement(TextInput, { style: s.input, keyboardType: "numeric", value: storage.year, onChangeText: function(v) { set("year", v); }, placeholderTextColor: "#5c5f65" })
                ),
                React.createElement(View, { style: s.row },
                    React.createElement(Text, { style: s.rowLabel }, "Month"),
                    React.createElement(TextInput, { style: s.input, keyboardType: "numeric", value: storage.month, onChangeText: function(v) { set("month", v); }, placeholderTextColor: "#5c5f65" })
                ),
                React.createElement(View, { style: s.row },
                    React.createElement(Text, { style: s.rowLabel }, "Day"),
                    React.createElement(TextInput, { style: s.input, keyboardType: "numeric", value: storage.day, onChangeText: function(v) { set("day", v); }, placeholderTextColor: "#5c5f65" })
                ),
                React.createElement(View, { style: s.row },
                    React.createElement(Text, { style: s.rowLabel }, "Hour"),
                    React.createElement(TextInput, { style: s.input, keyboardType: "numeric", value: storage.hour, onChangeText: function(v) { set("hour", v); }, placeholderTextColor: "#5c5f65" })
                ),
                React.createElement(View, { style: s.row },
                    React.createElement(Text, { style: s.rowLabel }, "Minute"),
                    React.createElement(TextInput, { style: s.input, keyboardType: "numeric", value: storage.minute, onChangeText: function(v) { set("minute", v); }, placeholderTextColor: "#5c5f65" })
                ),
                React.createElement(TouchableOpacity, { style: s.rowLast, onPress: sendFakeMessage },
                    React.createElement(Text, { style: s.sendLabel }, "Send Fake Message"),
                    React.createElement(Text, { style: s.sendSub }, (storage.savedCount ?? 0) + " messages saved | Timestamp: " + tsPreview)
                )
            ),
            React.createElement(View, { style: { height: 40 } })
        );
    }

    var commandUnpatch;

    return {
        onLoad: function() {
            commandUnpatch = registerCommand({
                name: "fakemsg",
                displayName: "fakemsg",
                description: "Send a local fake message",
                displayDescription: "Send a fake local message",
                applicationId: "-1",
                inputType: 1,
                options: [
                    { name: "user_id", displayName: "user_id", description: "Discord user ID (optional)", type: 3, required: false },
                    { name: "message", displayName: "message", description: "Message content", type: 3, required: true },
                ],
                execute: function(args) {
                    var uid = (args.find(function(a) { return a.name === "user_id"; }) || {}).value || "";
                    var msg = (args.find(function(a) { return a.name === "message"; }) || {}).value || "";
                    var prev = { userId: storage.userId, message: storage.message };
                    storage.userId = uid;
                    storage.message = msg;
                    sendFakeMessage();
                    storage.userId = prev.userId;
                    storage.message = prev.message;
                },
            });
        },
        onUnload: function() {
            if (commandUnpatch) commandUnpatch();
        },
        settings: FakeMessagesSettings,
    };
})();
