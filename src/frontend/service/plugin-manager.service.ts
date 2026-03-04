import { Injectable, ViewContainerRef } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from './notification/notification.service';
import { AuthService } from './auth.service';

export interface PluginConfigInterface {
    id: string;
    url: string;
}

@Injectable({
    providedIn: 'root',
})
export class PluginManagerService {
    plugins: any = {};
    constructor(
        private httpClient: HttpClient,
        private authService: AuthService,
        private notificationService: NotificationService
    ) {}

    get http(): HttpClient {
        return this.httpClient;
    }

    get notification(): NotificationService {
        return this.notificationService;
    }

    async storePlugins(plugins: PluginConfigInterface[]) {
        for (let index = 0; index < plugins.length; index++) {
            const plugin = plugins[index];
            try {
                const pluginContent = await this.loadRemotePlugin(plugin);
                this.plugins[plugin.id] = pluginContent;
                console.info(`PLUGIN ${plugin.id} LOADED`);
            } catch (err) {
                console.error(`PLUGIN ${plugin.id} FAILED: ${err}`);
            }
        }
    }

    async initPlugin(pluginName: string, containerRef: ViewContainerRef, extraData: any = {}) {
        if (!this.plugins[pluginName]) {
            return false;
        }
        try {
            containerRef.detach();
            const remoteComponent: any = containerRef.createComponent(
                this.plugins[pluginName][Object.keys(this.plugins[pluginName])[0]]
            );
            extraData = {
                ...extraData,
                pluginUrl: this.authService.plugins.find((plugin) => plugin.id === pluginName).url,
            };
            remoteComponent.instance.init({ ...this, ...extraData });
            return remoteComponent.instance;
        } catch (error) {
            this.notificationService.error(`Init plugin ${pluginName} failed !`);
            console.error(error);
            return false;
        }
    }

    loadRemotePlugin(plugin: PluginConfigInterface): Promise<any> {
        return loadRemoteModule({
            type: 'module',
            remoteEntry: `${plugin.url}/remoteEntry.js`,
            exposedModule: `./${plugin.id}`,
        });
    }

    async destroyPlugin(remoteComponent: ViewContainerRef): Promise<boolean> {
        try {
            remoteComponent.clear();
            return true;
        } catch (error) {
            console.error(`Destroy plugin failed : ${error}`);
            return false;
        }
    }
}
