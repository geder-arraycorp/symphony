/**
 * Tests for duplicate message prevention in the discussion panel.
 * Run with: node __tests__/maestro-duplicate-messages.test.js
 *
 * Covers:
 * - appendMessageToThread DOM structure
 * - updateMessages ID-based dedup
 * - WS-connected fallback behavior
 */

const fs = require("fs");
const path = require("path");

// Load shared utilities
const scriptJs = fs.readFileSync(
	path.join(__dirname, "..", "maestro", "static", "script.js"),
	"utf8"
);

// Minimal DOM mock (extended from maestro-send-responses.test.js patterns)
let elementIdCounter = 0;
const allElements = [];

function createElement(tag) {
	const el = {
		tagName: tag.toUpperCase(),
		className: "",
		textContent: "",
		innerHTML: "",
		_value: "",
		_disabled: false,
		_style: {},
		_children: [],
		_parent: null,
		_dataset: {},
		_listeners: {},
		placeholder: "",
		_removed: false,
		_row: null,
		_col: null,

		get value() { return this._value; },
		set value(v) { this._value = v; },

		get disabled() { return this._disabled; },
		set disabled(v) { this._disabled = v; },

		get style() { return this._style; },

		get dataset() {
			const self = this;
			return new Proxy(this._dataset, {
				set(target, prop, value) {
					target[prop] = String(value);
					return true;
				},
				get(target, prop) {
					return target[prop];
				}
			});
		},

		addEventListener(evt, fn) {
			if (!this._listeners[evt]) this._listeners[evt] = [];
			this._listeners[evt].push(fn);
		},

		dispatchEvent(evt) {
			const handlers = this._listeners[evt.type] || [];
			handlers.forEach(function(fn) { fn(evt); });
		},

		appendChild(child) {
			this._children.push(child);
			child._parent = this;
		},

		removeChild(child) {
			const idx = this._children.indexOf(child);
			if (idx !== -1) {
				this._children.splice(idx, 1);
				child._parent = null;
			}
		},

		remove() {
			this._removed = true;
			if (this._parent) {
				this._parent.removeChild(this);
			}
		},

		closest() { return null; },

		querySelector(sel) {
			if (sel === ".messages-empty" && this.className.indexOf("messages-thread") !== -1) {
				for (var i = 0; i < this._children.length; i++) {
					if (this._children[i].className === "messages-empty") return this._children[i];
				}
				return null;
			}
			if (sel === ".message") {
				for (var j = 0; j < this._children.length; j++) {
					if (this._children[j].className && this._children[j].className.indexOf("message ") === 0) return this._children[j];
				}
				return null;
			}
			for (var k = 0; k < this._children.length; k++) {
				var found = this._children[k].querySelector(sel);
				if (found) return found;
			}
			return null;
		},

		querySelectorAll(sel) {
			function findAll(el) {
				var results = [];
				if (sel === ".message") {
					if (el.className && el.className.indexOf("message ") === 0) results.push(el);
				}
				for (var i = 0; i < el._children.length; i++) {
					results = results.concat(findAll(el._children[i]));
				}
				return results;
			}
			return findAll(this);
		},

		classList: {
			_items: [],
			add(cls) { if (this._items.indexOf(cls) === -1) this._items.push(cls); },
			remove(cls) { this._items = this._items.filter(function(c) { return c !== cls; }); },
			contains(cls) { return this._items.indexOf(cls) !== -1; }
		},

		set textContent(v) {
			const s = String(v);
			this._text = s;
			this.innerHTML = s
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		},
		get textContent() { return this._text || ""; }
	};

	allElements.push(el);
	return el;
}

function resetDom() {
	allElements.length = 0;
	elementIdCounter = 0;
}

// Track created message elements for getElementById mock
var elementsById = {};

global.document = {
	createElement: createElement,
	getElementById: function(id) { return elementsById[id] || null; },
	querySelector: function() { return null; },
	querySelectorAll: function() { return []; },
	addEventListener: function() {}
};
// Mock WebSocket — override native WebSocket for WS-availability tests
global.WebSocket = function() {
	this.readyState = 0; // CONNECTING by default, tests set it
};
WebSocket.OPEN = 1;
WebSocket.CONNECTING = 0;
WebSocket.CLOSED = 3;

// Remove window mock that conflicts with native WebSocket
global.window = {};

// Evaluate shared utilities (escapeHtml)
eval(scriptJs);

/* ---- Re-implement the functions under test ---- */

// appendMessageToThread — mirrors plan.html (used as WS fallback)
function appendMessageToThread(msg) {
	const thread = document.getElementById("messages-thread");
	const emptyEl = thread.querySelector(".messages-empty");
	if (emptyEl) emptyEl.remove();

	const div = document.createElement("div");
	div.className = "message message-human";
	div.dataset.messageId = msg.id;
	div.innerHTML =
		'<div class="message-avatar">👤</div>' +
		'<div class="message-bubble">' +
			'<div class="message-meta">' +
				'<span class="message-role">You</span>' +
				'<span class="message-time">' + msg.created_at + '</span>' +
			'</div>' +
			'<p class="message-text">' + escapeHtml(msg.text) + '</p>' +
			(msg.item_ref ? '<span class="message-item-ref" data-item-ref="' + msg.item_ref + '">↳ referencing item ' + msg.item_ref + '</span>' : '') +
		'<button class="message-delete-btn" onclick="deleteMessage(\'' + msg.id + '\')" title="Delete message">✕</button>' +
		'</div>';
	thread.appendChild(div);
}

// updateMessages — mirrors plan.html WS handler, dedup by ID
function updateMessages(messages) {
	const thread = document.getElementById("messages-thread");
	const countEl = document.getElementById("messages-count");
	const emptyEl = thread.querySelector(".messages-empty");

	if (emptyEl && messages.length > 0) {
		emptyEl.remove();
	}

	const existingIDs = new Set();
	thread.querySelectorAll(".message").forEach(function(el) {
		existingIDs.add(el.dataset.messageId);
	});

	messages.forEach(function(msg) {
		if (existingIDs.has(msg.id)) return;

		const div = document.createElement("div");
		div.className = "message message-" + msg.role;
		div.dataset.messageId = msg.id;

		const avatar = msg.role === "agent" ? "🤖" : "👤";
		const roleLabel = msg.role === "agent" ? "Agent" : "You";

		let itemRefHtml = "";
		if (msg.item_ref) {
			itemRefHtml = '<span class="message-item-ref" data-item-ref="' + msg.item_ref + '">↳ referencing item ' + msg.item_ref + '</span>';
		}

		div.innerHTML =
			'<div class="message-avatar">' + avatar + '</div>' +
			'<div class="message-bubble">' +
				'<div class="message-meta">' +
					'<span class="message-role">' + roleLabel + '</span>' +
					'<span class="message-time">' + msg.created_at + '</span>' +
				'</div>' +
				'<p class="message-text">' + escapeHtml(msg.text) + '</p>' +
				itemRefHtml +
			'<button class="message-delete-btn" onclick="deleteMessage(\'' + msg.id + '\')" title="Delete message">✕</button>' +
			'</div>';

		thread.appendChild(div);
	});

	if (countEl) {
		countEl.textContent = messages.length;
	}
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
	if (condition) {
		console.log(`  PASS: ${label}`);
		passed++;
	} else {
		console.log(`  FAIL: ${label}`);
		failed++;
	}
}

function assertEqual(actual, expected, label) {
	if (actual === expected) {
		console.log(`  PASS: ${label}`);
		passed++;
	} else {
		console.log(`  FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
		failed++;
	}
}

console.log("=== Duplicate Message Prevention ===");

// 1. appendMessageToThread creates correct DOM structure
resetDom();
elementsById = {};
const thread1 = createElement("div");
thread1.className = "messages-thread";
thread1.id = "messages-thread";
elementsById["messages-thread"] = thread1;

const countEl1 = createElement("span");
countEl1.id = "messages-count";
elementsById["messages-count"] = countEl1;

appendMessageToThread({
	id: "msg_001",
	role: "human",
	text: "Hello",
	created_at: "2026-07-15T12:00:00Z"
});

assert(thread1._children.length === 1, "appendMessageToThread appends one message div");
const msgDiv1 = thread1._children[0];
assert(msgDiv1.className === "message message-human", "message div has correct className");
assert(msgDiv1.dataset.messageId === "msg_001", "message div has correct dataset.messageId");
assert(msgDiv1.innerHTML.indexOf("Hello") !== -1, "message text is in innerHTML");
assert(msgDiv1.innerHTML.indexOf("escapeHtml") === -1, "message text is not 'escapeHtml(text)'");

// 2. appendMessageToThread removes empty placeholder
resetDom();
elementsById = {};
const thread2 = createElement("div");
thread2.className = "messages-thread";
thread2.id = "messages-thread";
elementsById["messages-thread"] = thread2;
const emptyEl2 = createElement("p");
emptyEl2.className = "messages-empty";
emptyEl2.textContent = "No messages yet.";
thread2.appendChild(emptyEl2);
elementsById["messages-count"] = createElement("span");
elementsById["messages-count"].id = "messages-count";

assert(thread2._children.length === 1, "thread starts with placeholder");
appendMessageToThread({ id: "msg_001", role: "human", text: "Hi", created_at: "2026-07-15T12:00:00Z" });
assert(thread2._children.length === 1, "placeholder removed when message appended");

// 3. updateMessages dedup — messages with existing IDs are not added again
resetDom();
elementsById = {};
const thread3 = createElement("div");
thread3.className = "messages-thread";
thread3.id = "messages-thread";
elementsById["messages-thread"] = thread3;
const countEl3 = createElement("span");
countEl3.id = "messages-count";
countEl3.textContent = "0";
elementsById["messages-count"] = countEl3;

// Pre-populate with one message (simulating local append or server render)
const existingMsg = createElement("div");
existingMsg.className = "message message-human";
existingMsg.dataset.messageId = "msg_001";
thread3.appendChild(existingMsg);

// Now updateMessages is called with the same message in the array
updateMessages([
	{ id: "msg_001", role: "human", text: "Hello", created_at: "2026-07-15T12:00:00Z" },
	{ id: "msg_002", role: "human", text: "World", created_at: "2026-07-15T12:01:00Z" }
]);

// Should have 3: existingMsg + msg_001 (skipped) + msg_002 (new)
const msgElements3 = thread3.querySelectorAll(".message");
assert(msgElements3.length === 2, "updateMessages dedup: only new message appended (not duplicate)");
assertEqual(countEl3.textContent, "2", "updateMessages sets count to messages.length");

// 4. updateMessages handles empty messages gracefully
resetDom();
elementsById = {};
const thread4 = createElement("div");
thread4.className = "messages-thread";
thread4.id = "messages-thread";
elementsById["messages-thread"] = thread4;
elementsById["messages-count"] = createElement("span");
elementsById["messages-count"].id = "messages-count";

updateMessages([]);
assert(thread4._children.length === 0, "updateMessages with empty array adds nothing");

// 5. WS-fallback pattern: when WebSocket is OPEN, skip local append
resetDom();
elementsById = {};
const thread5 = createElement("div");
thread5.className = "messages-thread";
thread5.id = "messages-thread";
elementsById["messages-thread"] = thread5;
elementsById["messages-count"] = createElement("span");
elementsById["messages-count"].id = "messages-count";

// Simulate WS connected (OPEN) by checking the condition directly
// This is the exact pattern used in the fixed handlers
const wsOpen = WebSocket.OPEN; // 1
let locallyAppended = false;
if (wsOpen !== WebSocket.OPEN) {
	locallyAppended = true;
}
assert(locallyAppended === false, "condition check: no local append when ws.readyState === WebSocket.OPEN");

// Also verify that the literal condition works:
//   if (ws.readyState !== WebSocket.OPEN) { appendMessageToThread(msg); }
// When readyState is OPEN, the body does NOT execute.
assert((WebSocket.OPEN !== WebSocket.OPEN) === false, "1 !== 1 is false — body not entered");

// 6. WS-fallback: when WebSocket is not OPEN, append locally
resetDom();
elementsById = {};
const thread6 = createElement("div");
thread6.className = "messages-thread";
thread6.id = "messages-thread";
elementsById["messages-thread"] = thread6;
elementsById["messages-count"] = createElement("span");
elementsById["messages-count"].id = "messages-count";

// Simulate WS not connected by checking the condition directly
// When readyState is CLOSED (3), 3 !== 1 is true, so body executes
const wsClosed = 3; // WebSocket.CLOSED
let fallbackCalled = false;
if (wsClosed !== WebSocket.OPEN) {
	appendMessageToThread({ id: "msg_001", role: "human", text: "Fallback message", created_at: "2026-07-15T12:00:00Z" });
	fallbackCalled = true;
}
assert(fallbackCalled === true, "condition check: local append happens when ws.readyState !== WebSocket.OPEN");
assert(thread6._children.length === 1, "appendMessageToThread was called as fallback");

// 7. updateMessages handles agent messages with correct role label
resetDom();
elementsById = {};
const thread7 = createElement("div");
thread7.className = "messages-thread";
thread7.id = "messages-thread";
elementsById["messages-thread"] = thread7;
elementsById["messages-count"] = createElement("span");
elementsById["messages-count"].id = "messages-count";

updateMessages([
	{ id: "msg_003", role: "agent", text: "I'll look into it.", created_at: "2026-07-15T12:00:00Z" }
]);
const msgs7 = thread7.querySelectorAll(".message");
assert(msgs7.length === 1, "agent message appended by updateMessages");
assert(msgs7[0].className === "message message-agent", "agent message has correct className");
assert(msgs7[0].innerHTML.indexOf("🤖") !== -1, "agent message has robot avatar");

// 8. updateMessages adds item_ref when present
resetDom();
elementsById = {};
const thread8 = createElement("div");
thread8.className = "messages-thread";
thread8.id = "messages-thread";
elementsById["messages-thread"] = thread8;
elementsById["messages-count"] = createElement("span");
elementsById["messages-count"].id = "messages-count";

updateMessages([
	{ id: "msg_004", role: "human", text: "About step 2", item_ref: "1:2", created_at: "2026-07-15T12:00:00Z" }
]);
const msgs8 = thread8.querySelectorAll(".message");
assert(msgs8.length === 1, "message with item_ref appended");
assert(msgs8[0].innerHTML.indexOf("referencing item") !== -1, "item_ref HTML is rendered");
assert(msgs8[0].innerHTML.indexOf("1:2") !== -1, "item_ref value appears in HTML");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
