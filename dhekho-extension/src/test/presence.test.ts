import * as assert from 'assert';
import { PresenceManager } from '../services/PresenceManager';
import { getDeveloperBadge, getDeveloperColor } from '../services/DeveloperColorService';

suite('Dhekho Unit Tests', () => {
    test('DeveloperColorService provides consistent stable colors and badges', () => {
        const color1 = getDeveloperColor('alice');
        const color2 = getDeveloperColor('alice');
        const color3 = getDeveloperColor('bob');

        assert.strictEqual(color1.id, color2.id, 'Same developer should receive identical color');
        
        const badgeAlice = getDeveloperBadge('Alice Smith');
        assert.strictEqual(badgeAlice, 'AS');

        const badgeBob = getDeveloperBadge('bob');
        assert.strictEqual(badgeBob, 'B');
    });

    test('PresenceManager handles file and folder presence correctly', () => {
        const manager = new PresenceManager();

        manager.setSnapshot([
            {
                developerId: 'alice',
                developerName: 'Alice',
                workspaceId: 'test',
                activeFile: 'src/auth/login.ts',
                lastSeen: new Date().toISOString()
            },
            {
                developerId: 'bob',
                developerName: 'Bob',
                workspaceId: 'test',
                activeFile: 'src/components/Navbar.tsx',
                lastSeen: new Date().toISOString()
            }
        ], 'self');

        // File presence checks
        const loginPresence = manager.getFilePresence('src/auth/login.ts');
        assert.strictEqual(loginPresence.length, 1);
        assert.strictEqual(loginPresence[0].developerId, 'alice');

        const navbarPresence = manager.getFilePresence('src/components/Navbar.tsx');
        assert.strictEqual(navbarPresence.length, 1);
        assert.strictEqual(navbarPresence[0].developerId, 'bob');

        // Folder presence checks
        const authFolderPresence = manager.getFolderPresence('src/auth');
        assert.strictEqual(authFolderPresence.length, 1);
        assert.strictEqual(authFolderPresence[0].developerId, 'alice');

        const srcFolderPresence = manager.getFolderPresence('src');
        assert.strictEqual(srcFolderPresence.length, 2);

        // Disconnect Bob
        manager.removeDeveloper('bob');
        const srcFolderPostDisconnect = manager.getFolderPresence('src');
        assert.strictEqual(srcFolderPostDisconnect.length, 1);
        assert.strictEqual(srcFolderPostDisconnect[0].developerId, 'alice');

        manager.dispose();
    });
});
