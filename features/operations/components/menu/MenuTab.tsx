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
    const {
        menu,
        inventory,
        handleAddMenuItem,
        handleUpdateMenuItem,
        handleDeleteMenuItem
    } = useOperationsData();

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
