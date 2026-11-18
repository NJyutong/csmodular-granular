export function positionContextMenu(menu, x, y) {
    const inset = 8;
    menu.style.maxHeight = 'calc(100dvh - 16px)';
    menu.style.overflowY = 'auto';
    menu.style.display = 'block';
    menu.scrollTop = 0;
    const {width, height} = menu.getBoundingClientRect();
    menu.style.left = Math.max(inset, Math.min(x, window.innerWidth - width - inset)) + 'px';
    menu.style.top = Math.max(inset, Math.min(y, window.innerHeight - height - inset)) + 'px';
}
