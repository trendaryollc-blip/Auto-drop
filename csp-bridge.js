const CSP_NONCE_VALUE = 'huntdrop-csp-nonce';

function applyNonce(element) {
  if (!element || typeof element.setAttribute !== 'function') return;
  const hasInlineStyle = typeof element.getAttribute === 'function' && element.getAttribute('style') !== null;
  const hasStyleSupport = typeof element.tagName === 'string' && element.tagName !== 'undefined';
  const isStyleTag = element.tagName === 'STYLE';
  if ((hasInlineStyle || hasStyleSupport || isStyleTag) && !element.getAttribute('nonce')) {
    element.setAttribute('nonce', CSP_NONCE_VALUE);
  }
}

function upgradeInlineHandlers(element) {
  if (!element || typeof element.getAttribute !== 'function') return;
  const attrs = Array.from(element.attributes || []);
  attrs.forEach((attr) => {
    if (!attr.name.startsWith('on')) return;
    const eventName = attr.name.slice(2);
    if (!eventName) return;
    // Instead of using new Function() (which violates CSP),
    // rely on the inline handler already being a property on the element.
    // We extract it, remove the attribute, and re-attach as addEventListener.
    const inlineFn = element[attr.name];
    element.removeAttribute(attr.name);
    if (typeof inlineFn === 'function') {
      element.addEventListener(eventName, function (e) {
        inlineFn.call(element, e);
      });
    }
  });
}

function processElementTree(root) {
  if (!root) return;
  const walker = root.ownerDocument ? root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT) : null;
  if (!walker) return;
  let current = walker.nextNode();
  while (current) {
    applyNonce(current);
    upgradeInlineHandlers(current);
    current = walker.nextNode();
  }
}

function installCspNonceBridge() {
  if (window.__huntdropCspBridgeInstalled) return;
  window.__huntdropCspBridgeInstalled = true;

  const targetPrototype = typeof HTMLElement !== 'undefined' ? HTMLElement.prototype : Element.prototype;
  const originalStyleDescriptor = Object.getOwnPropertyDescriptor(targetPrototype, 'style');
  if (originalStyleDescriptor && originalStyleDescriptor.get) {
    Object.defineProperty(targetPrototype, 'style', {
      configurable: true,
      get() {
        const style = originalStyleDescriptor.get.call(this);
        if (style && typeof style.setProperty === 'function') {
          applyNonce(this);
        }
        return style;
      },
      set(value) {
        if (originalStyleDescriptor.set) {
          originalStyleDescriptor.set.call(this, value);
        } else if (originalStyleDescriptor.get) {
          const style = originalStyleDescriptor.get.call(this);
          if (style) {
            style.cssText = value;
          }
        }
        applyNonce(this);
      },
    });
  }

  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function (tagName, options) {
    const element = originalCreateElement(tagName, options);
    if (element && typeof element.style !== 'undefined') {
      applyNonce(element);
    }
    return element;
  };

  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    const result = originalSetAttribute.call(this, name, value);
    if (name === 'style' || name === 'nonce') {
      applyNonce(this);
    }
    if (name.startsWith('on')) {
      upgradeInlineHandlers(this);
    }
    return result;
  };

  const originalSetAttributeNS = Element.prototype.setAttributeNS;
  Element.prototype.setAttributeNS = function (namespace, qualifiedName, value) {
    const result = originalSetAttributeNS.call(this, namespace, qualifiedName, value);
    if (qualifiedName === 'style' || qualifiedName === 'nonce') {
      applyNonce(this);
    }
    if (qualifiedName.startsWith('on')) {
      upgradeInlineHandlers(this);
    }
    return result;
  };

  const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (originalInnerHTMLDescriptor) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: true,
      get() {
        return originalInnerHTMLDescriptor.get.call(this);
      },
      set(value) {
        const result = originalInnerHTMLDescriptor.set.call(this, value);
        processElementTree(this);
        return result;
      },
    });
  }

  const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (position, html) {
    const result = originalInsertAdjacentHTML.call(this, position, html);
    processElementTree(this);
    return result;
  };

  document.querySelectorAll('*').forEach((element) => {
    applyNonce(element);
    upgradeInlineHandlers(element);
  });
}

installCspNonceBridge();

if (typeof window !== 'undefined') {
  window.CSP_NONCE_VALUE = CSP_NONCE_VALUE;
  window.installCspNonceBridge = installCspNonceBridge;
}
