/**
 * Inspired by Neil Gaiman
 * http://neil-gaiman.tumblr.com/post/43087620460/i-was-reading-a-book-about-interjections-oddly
 *
 * http://creativecommons.org/licenses/by/4.0/
 *
 * If you're here looking to see how things work, welcome! Hopefully it is not
 * too hard to get around. If you're here looking for security issues or
 * malicious intent, I hope that you will walk away very bored. No phoning-home
 * going on here.
 */

// Here are our text replacements ordered such that phrases that are sub-strings
// of other phrases are lower in the list. The `casePreservingReplacer` will
// return a function which actually performs the replacement.
var REPLACEMENTS = [
  casePreservingReplacer(
    'political correctness',
    'treating other people with respect'
  ),
  casePreservingReplacer(
    'politically correctness',
    'treating other people with respect'
  ),
  casePreservingReplacer(
    'political incorrectness',
    'treating other people with disrespect'
  ),
  casePreservingReplacer(
    'politically correct crap',
    'respecting other people crap'
  ),
  casePreservingReplacer(
    'politically correct',
    'respectful of other people'
  ),
  casePreservingReplacer(
    'politically incorrect',
    'disrespectful of other people'
  ),
];

// Given a text DOM node, apply all replacements on its textContent.
function editTextNode(node) {
  var text = node.textContent;
  for (var i = 0; i < REPLACEMENTS.length; i++) {
    text = REPLACEMENTS[i](text);
  }
  node.textContent = text;
}

// Given a pattern string and replacement, this will return a function that when
// called with a source, will return the source with replacements having
// been made. The novelty is that although this replacement is case-insensitive,
// it will attempt to match the same casing that was originally found.
function casePreservingReplacer(pattern, replacement) {
  var commonCases = {};
  commonCases[upperCase(pattern)] = upperCase(replacement);
  commonCases[sentenceCase(pattern)] = sentenceCase(replacement);
  commonCases[titleCase(pattern)] = titleCase(replacement);
  commonCases[dashed(pattern)] = dashed(replacement);
  commonCases[dashed(upperCase(pattern))] = dashed(upperCase(replacement));
  commonCases[dashed(sentenceCase(pattern))] = dashed(sentenceCase(replacement));
  commonCases[dashed(titleCase(pattern))] = dashed(titleCase(replacement));
  var regexp = new RegExp(pattern + '|' + dashed(pattern), 'ig');
  var replacer = function (match) {
    return commonCases[match] || replacement;
  };
  return function applyCasePreservingReplacer(source) {
    return source.replace(regexp, replacer);
  }
}

// dashed-looks-like-this
function dashed(str) {
  return str.replace(/\s/g, '-');
}

// UPPER CASE LOOKS LIKE THIS
function upperCase(str) {
  return str.toUpperCase();
}

// Sentence case looks like this
function sentenceCase(str) {
  return upperCase(str[0]) + str.slice(1);
}

// Title Case Looks Like This
function titleCase(str) {
  return str.replace(/\w+/g, sentenceCase);
}

// When walking the DOM, there are some node types we just don't want to mess
// with to avoid breaking the page behavior or style.
var EXCLUDE_TAGS = {
  CODE: true,
  LINK: true,
  META: true,
  PRE: true,
  SCRIPT: true,
  STYLE: true,
  TEXTAREA: true,
};

// Determine if this node is excluded. Is it one of the excluded tag names, or
// is it content-editable (a faux textarea)?
function isExcluded(node) {
  return EXCLUDE_TAGS[node.nodeName] || node.contentEditable === 'true';
}

// Determine if this node exists anywhere within an excluded node.
function withinExcluded(node) {
  while (node) {
    if (isExcluded(node)) {
      return true;
    }
    node = node.parentNode;
  }
}

// This recursive function is the generic vehicle for walking a DOM and doing
// some work on text nodes. Visits all nodes in the given nodeList, applying
// the function on TEXT_NODE, and recursing into childNodes for ELEMENT_NODE.
function visitTextNodes(node, fn) {
  if (node.nodeType === Node.TEXT_NODE) {
    fn(node);
  } else if (node.nodeType === Node.ELEMENT_NODE && !isExcluded(node)) {
    for (var i = 0; i < node.childNodes.length; i++) {
      visitTextNodes(node.childNodes[i], fn);
    }
  }
}

// This chrome extension runs before any DOM has been parsed by the browser
// (see "run_at": "document_start" in manifest.json) which means that a mutation
// observer will see all additions of DOM from this point forward.
// When new DOM is added, or existing text elements are changed this function
// will be called allowing us to call editTextNode on every new or changed text
// DOM node.
function observeMutations(mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var mutation = mutations[i];
    if (mutation.type === 'characterData' && !withinExcluded(mutation.target)) {
      editTextNode(mutation.target);
    } else if (mutation.type === 'childList') {
      for (var j = 0; j < mutation.addedNodes.length; j++) {
        var addedNode = mutation.addedNodes[j];
        if (!withinExcluded(addedNode)) {
          visitTextNodes(addedNode, editTextNode);
        }
      }
    }
  }
}

// Now it's go time. Actually set up the observation of mutations to the
// primary document DOM node.
new MutationObserver(observeMutations).observe(
  document.documentElement,
  { subtree: true, childList: true, characterData: true }
);
