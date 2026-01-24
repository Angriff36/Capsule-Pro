"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsTrigger = void 0;
const react_1 = require("@knocklabs/react");
const react_2 = require("react");
const keys_1 = require("../keys");
// Required CSS import, unless you're overriding the styling
require("@knocklabs/react/dist/index.css");
require("../styles.css");
const NotificationsTrigger = () => {
  const [isVisible, setIsVisible] = (0, react_2.useState)(false);
  const [isMounted, setIsMounted] = (0, react_2.useState)(false);
  const notifButtonRef = (0, react_2.useRef)(null);
  (0, react_2.useEffect)(() => {
    setIsMounted(true);
  }, []);
  const handleClose = (event) => {
    if (event.target === notifButtonRef.current) {
      return;
    }
    setIsVisible(false);
  };
  if (!((0, keys_1.keys)().NEXT_PUBLIC_KNOCK_API_KEY && isMounted)) {
    return null;
  }
  return (
    <>
      <react_1.NotificationIconButton
        onClick={() => setIsVisible(!isVisible)}
        ref={notifButtonRef}
      />
      {notifButtonRef.current && (
        <react_1.NotificationFeedPopover
          buttonRef={notifButtonRef}
          isVisible={isVisible}
          onClose={handleClose}
        />
      )}
    </>
  );
};
exports.NotificationsTrigger = NotificationsTrigger;
