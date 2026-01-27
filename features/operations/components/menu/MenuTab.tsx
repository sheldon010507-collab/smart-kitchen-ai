/**
 * MenuTab Component
 * 
 * 菜单管理页面 - 重用现有的 MenuManager 组件
 */

import React from 'react';
import { useOperationsData } from '../../hooks/useOperationsData';
import { MenuManager } from '../../../menu';
import { MenuItem } from '../../../../types';

export const MenuTab: React.FC = () => {
    const { menu, inventory, setMenu } = useOperationsData();

    const handleAddMenuItem = (item: MenuItem) => {
        setMenu(prev => [...prev, item]);
    };

    const handleUpdateMenuItem = (item: MenuItem) => {
        setMenu(prev => prev.map(m => m.id === item.id ? item : m));
    };

    const handleDeleteMenuItem = (id: string) => {
        setMenu(prev => prev.filter(m => m.id !== id));
    };

    return (
        <MenuManager
            menu={menu}
            inventory={inventory}
            onAddMenuItem={handleAddMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
        />
    );
};
