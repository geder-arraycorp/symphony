/**
 * Tests for send-responses DOM logic.
 * Run with: node __tests__/maestro-send-responses.test.js
 *
 * Tests the DOM manipulation patterns used by the send-responses feature
 * in maestro/templates/plan.html without needing to load the inline script.
 */

const fs = require("fs");
const path = require("path");

// Load shared utilities
const scriptJs = fs.readFileSync(
	path.join(__dirname, "..", "maestro", "static", "script.js"),
	"utf8"
);

// Minimal DOM mock
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

		get value() { return this._value; },
		set value(v) { this._value = v; },

		get disabled() { return this._disabled; },
		set disabled(v) { this._disabled = v; },

		get style() { return this._style; },

		get dataset() {
			// Proxy to convert values to strings, matching real DOM behavior
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

		closest(selector) {
			let e = this;
			while (e) {
				if (selector === "[data-module-idx]" && e._dataset && e._dataset.moduleIdx !== undefined) return e;
				if (selector === "[data-item-idx]" && e._dataset && e._dataset.itemIdx !== undefined) return e;
				if (selector.startsWith(".")) {
					const cls = selector.slice(1);
					if (e.className && e.className.split(" ").indexOf(cls) !== -1) return e;
				}
				e = e._parent;
			}
			return null;
		},

		querySelector(sel) {
			function find(el) {
				if (sel === ".questions-send-bar" && el.className === "questions-send-bar") return el;
				if (sel === ".questions-send-btn" && el.className === "questions-send-btn") return el;
				if (sel === ".questions-send-count" && el.className === "questions-send-count") return el;
				if (sel === ".questions-send-status" && el.className === "questions-send-status") return el;
				for (var i = 0; i < el._children.length; i++) {
					var found = find(el._children[i]);
					if (found) return found;
				}
				return null;
			}
			return find(this);
		},

		querySelectorAll(sel) {
			function findAll(el) {
				var results = [];
				if (sel === ".question-item:not(.question-answered) .question-input") {
					// Check if this element matches
					if (el.className === "question-input" && el._parent &&
						el._parent.className && el._parent.className.indexOf("question-item") !== -1 &&
						el._parent.className.indexOf("question-answered") === -1) {
						results.push(el);
					}
					// Recurse
					for (var i = 0; i < el._children.length; i++) {
						results = results.concat(findAll(el._children[i]));
					}
					return results;
				}
				if (sel === ".question-status") {
					if (el.className === "question-status") results.push(el);
					for (var j = 0; j < el._children.length; j++) {
						results = results.concat(findAll(el._children[j]));
					}
					return results;
				}
				// Generic: recurse
				for (var k = 0; k < el._children.length; k++) {
					results = results.concat(findAll(el._children[k]));
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
			this._text = v;
			this.innerHTML = v
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

global.document = {
	createElement: createElement,
	getElementById: function() { return null; },
	querySelector: function() { return null; },
	querySelectorAll: function() { return []; },
	addEventListener: function() {}
};
global.window = {};

// Evaluate shared utilities (escapeHtml, updateAgentDot)
eval(scriptJs);

/* ---- Re-implement the send-responses logic under test ---- */

// This mirrors the setupQuestionSendBar logic from plan.html
function setupQuestionSendBar(moduleEl) {
	const sendBar = moduleEl.querySelector(".questions-send-bar");
	if (!sendBar) return;
	const btn = sendBar.querySelector(".questions-send-btn");
	const countEl = sendBar.querySelector(".questions-send-count");
	const statusEl = sendBar.querySelector(".questions-send-status");

	function updateCount() {
		const inputs = moduleEl.querySelectorAll(".question-item:not(.question-answered) .question-input");
		let filled = 0;
		inputs.forEach(function(ta) {
			if (ta.value.trim()) filled++;
		});
		countEl.textContent = filled + " answered";
		countEl.dataset.qsCount = filled;
		btn.disabled = filled === 0;
	}

	moduleEl.querySelectorAll(".question-item:not(.question-answered) .question-input").forEach(function(ta) {
		ta.addEventListener("input", updateCount);
	});

	updateCount();
}

// This mirrors renderQuestions logic from plan.html
function renderQuestions(items, moduleEl) {
	const ul = document.createElement("ul");
	ul.className = "item-list questions-list";
	(items || []).forEach(function(item, ii) {
		const li = document.createElement("li");
		li.className = "question-item" + (item.answered ? " question-answered" : "");
		li.dataset.itemIdx = ii;

		const header = document.createElement("div");
		header.className = "question-header";

		const status = document.createElement("span");
		status.className = "question-status";
		status.textContent = item.answered ? "✓" : "?";
		header.appendChild(status);

		const text = document.createElement("span");
		text.className = "question-text";
		text.textContent = item.text;
		header.appendChild(text);
		li.appendChild(header);

		if (!item.answered) {
			const ta = document.createElement("textarea");
			ta.className = "question-input";
			ta.placeholder = "Type your answer…";
			ta.rows = 2;
			li.appendChild(ta);
		}

		if (item.answer) {
			const p = document.createElement("p");
			p.className = "question-answer";
			p.innerHTML = "<strong>Answer:</strong> " + escapeHtml(item.answer);
			li.appendChild(p);
		}

		ul.appendChild(li);
	});

	// Build send-bar children explicitly for test DOM
	const sendBar = document.createElement("div");
	sendBar.className = "questions-send-bar";
	const sc = document.createElement("span");
	sc.className = "questions-send-count";
	sc.dataset.qsCount = "0";
	sc.textContent = "0 answered";
	sendBar.appendChild(sc);
	const sb = document.createElement("button");
	sb.className = "questions-send-btn";
	sb.disabled = true;
	sb.textContent = "Send Responses";
	sendBar.appendChild(sb);
	const ss = document.createElement("span");
	ss.className = "questions-send-status";
	sendBar.appendChild(ss);

	moduleEl.appendChild(ul);
	moduleEl.appendChild(sendBar);

	setupQuestionSendBar(moduleEl);
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

console.log("=== send-responses ===");

// 1. renderQuestions creates the send bar with proper structure
resetDom();
const body = createElement("div");
body.className = "module-body";
const items = [
	{ text: "Q1: What is your plan?", answered: false, answer: "" },
	{ text: "Q2: What is the deadline?", answered: true, answer: "Friday" }
];
renderQuestions(items, body);
const sendBar = body.querySelector(".questions-send-bar");
assert(sendBar !== null, "renderQuestions appends .questions-send-bar");

const btn = sendBar.querySelector(".questions-send-btn");
assert(btn !== null, "send bar contains a button");
assert(btn.disabled === true, "send button is disabled when no answers filled");

const countEl = sendBar.querySelector(".questions-send-count");
assert(countEl !== null, "send bar contains a count element");
assert(countEl.textContent.indexOf("answered") !== -1, "count contains 'answered' text");

const statusEl = sendBar.querySelector(".questions-send-status");
assert(statusEl !== null, "send bar contains a status element");

// 2. unanswered items get textareas, answered ones don't
resetDom();
const body2 = createElement("div");
body2.className = "module-body";
const items2 = [
	{ text: "Q1", answered: false, answer: "" },
	{ text: "Q2", answered: true, answer: "Done" }
];
renderQuestions(items2, body2);
const textareas = body2.querySelectorAll(".question-item:not(.question-answered) .question-input");
assert(textareas.length === 1, "only one unanswered textarea rendered");

// 3. count updates when user types in a textarea
resetDom();
const body3 = createElement("div");
body3.className = "module-body";
renderQuestions([
	{ text: "Q1", answered: false, answer: "" },
	{ text: "Q2", answered: false, answer: "" }
], body3);

const qInputs = body3.querySelectorAll(".question-item:not(.question-answered) .question-input");
assert(qInputs.length === 2, "two unanswered textareas rendered");

const btn3 = body3.querySelector(".questions-send-btn");
assert(btn3.disabled === true, "button disabled before typing");

// Fill in one textarea
qInputs[0]._value = "My answer";
qInputs[0].dispatchEvent({ type: "input", target: qInputs[0] });

const countEl3 = body3.querySelector(".questions-send-count");
// The input event triggers updateCount which updates the button and count
assert(countEl3.textContent === "1 answered", 'count shows "1 answered" after filling one');
assert(btn3.disabled === false, "button enabled after filling one answer");

// Fill in the second
qInputs[1]._value = "Second answer";
qInputs[1].dispatchEvent({ type: "input", target: qInputs[1] });
assert(countEl3.textContent === "2 answered", 'count shows "2 answered" after filling both');

// Clear the first
qInputs[0]._value = "";
qInputs[0].dispatchEvent({ type: "input", target: qInputs[0] });
assert(countEl3.textContent === "1 answered", 'count shows "1 answered" after clearing one');

// Clear all
qInputs[1]._value = "";
qInputs[1].dispatchEvent({ type: "input", target: qInputs[1] });
assert(countEl3.textContent === "0 answered", 'count shows "0 answered" after clearing all');
assert(btn3.disabled === true, "button disabled after clearing all answers");

// 4. escapeHtml is used for answer display (function from script.js)
assert(typeof escapeHtml === "function", "escapeHtml function available");
assert(escapeHtml("<test>") === "&lt;test&gt;", "escapeHtml escapes HTML in answers");

// 5. Item ref format: moduleIdx:itemIdx
resetDom();
const wrapper = createElement("div");
wrapper._dataset.moduleIdx = "3";
const body5 = createElement("div");
body5.className = "module-body";
wrapper.appendChild(body5);
renderQuestions([
	{ text: "Q1", answered: false, answer: "" }
], body5);

// check the li element directly via the ul
const ul5 = body5._children[0];
const li5 = ul5._children[0];
assert(li5._dataset.itemIdx === "0", 'first item has itemIdx "0"');
assert(wrapper._dataset.moduleIdx === "3", 'wrapper has moduleIdx "3"');
const itemRef = wrapper._dataset.moduleIdx + ":" + li5._dataset.itemIdx;
assert(itemRef === "3:0", 'itemRef resolves to "3:0"');

// 6. answered items get the answer displayed and no textarea
resetDom();
const body6 = createElement("div");
body6.className = "module-body";
renderQuestions([
	{ text: "Q1", answered: true, answer: "Already answered" }
], body6);
const ul6 = body6._children[0];
const answeredLi = ul6._children[0];
assert(answeredLi.className.indexOf("question-answered") !== -1, "answered item has question-answered class");
const ansChildren = answeredLi._children.filter(function(c) { return c.className === "question-answer"; });
assert(ansChildren.length > 0, "answered item has .question-answer element");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
