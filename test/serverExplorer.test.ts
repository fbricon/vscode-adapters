import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ServersViewTreeDataProvider } from '../src/serverExplorer';
import { RSPClient, Protocol } from 'rsp-client';
import { EventEmitter, window, Uri, OutputChannel, TreeItemCollapsibleState } from 'vscode';
import * as path from 'path';

const expect = chai.expect;
chai.use(sinonChai);

suite('Server explorer', () => {

    let sandbox: sinon.SinonSandbox;
    let getStub: sinon.SinonStub;
    const clientStub: RSPClient = new RSPClient('somehost', 8080);
    let serverExplorer: ServersViewTreeDataProvider;

    const serverType: Protocol.ServerType = {
        description: 'a type',
        id: 'type',
        visibleName: 'the type'
    };

    const serverHandle: Protocol.ServerHandle = {
        id: 'id',
        type: serverType
    };

    const serverState: Protocol.ServerState =  {
        server: serverHandle,
        deployableStates: [],
        publishState: 0,
        state: 0
    }

    const ProcessOutput: Protocol.ServerProcessOutput = {
        processId: 'process id',
        server: serverHandle,
        streamType: 0,
        text: 'the type'
    };

    const fakeChannel: OutputChannel = {
        append: () => {},
        show: () => {},
        clear: () => {},
        dispose: () => {},
        appendLine: () => {},
        hide: () => {},
        name: 'fake'
    };

    setup(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(clientStub, 'connect').resolves();
        sandbox.stub(clientStub, 'getServerHandles').resolves([]);
        sandbox.stub(clientStub, 'getServerState').resolves(serverState);
        serverExplorer = new ServersViewTreeDataProvider(clientStub);
        getStub = sandbox.stub(serverExplorer.serverOutputChannels, 'get').returns(fakeChannel);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('insertServer call should add server to tree data model', async () => {
        const refreshStub = sandbox.stub(serverExplorer, 'refresh');
        await serverExplorer.insertServer(serverHandle);
        const children = serverExplorer.getChildren();

        expect(refreshStub).calledOnce;
        expect(children.length).equals(1);
        expect(children[0].server).exist;
        expect(children[0].server).deep.equals(serverHandle);
    });

    test('removeServer call should remove server from tree data model', () => {
        const children = serverExplorer.getChildren();
        sandbox.stub(serverExplorer, 'refresh');
        serverExplorer.insertServer(serverHandle);
        serverExplorer.removeServer(serverHandle);

        expect(getStub).calledOnce;
        expect(children).empty;
    });

    test('showOutput call should show servers output channel', () => {
        const spy = sandbox.spy(fakeChannel, 'show');
        serverExplorer.showOutput(serverState);

        expect(getStub).calledOnce;
        expect(spy).calledOnce;
    });

    test('addServerOutput call should show ServerOutput channel', () => {
        const appendSpy = sandbox.spy(fakeChannel, 'append');
        serverExplorer.addServerOutput(ProcessOutput);

        expect(getStub).calledOnce;
        expect(appendSpy).calledOnce;
    });

    test('refresh should trigger getChildren call for root node', () => {
        const fireStub = sandbox.stub(EventEmitter.prototype, 'fire');
        serverExplorer.refresh(serverState);

        expect(fireStub).calledOnceWith(serverState);
    });

    suite('updateServer', () => {

	//let getServersStub: sinon.SinonStub;
        let setStatusStub: sinon.SinonStub;

        const stateChangeUnknown: Protocol.ServerState = {
            server: serverHandle,
            state: 0,
            publishState: 1,
            deployableStates: []
        };
        const stateChangeStarting: Protocol.ServerState = {
            server: serverHandle,
            state: 1,
            publishState: 1,
            deployableStates: []
        };
        const stateChangeStarted: Protocol.ServerState = {
            server: serverHandle,
            state: 2,
            publishState: 1,
            deployableStates: []
        };
        const stateChangeStopping: Protocol.ServerState = {
            server: serverHandle,
            state: 3,
            publishState: 1,
            deployableStates: []
        };
        const stateChangeStopped: Protocol.ServerState = {
            server: serverHandle,
            state: 4,
            publishState: 1,
            deployableStates: []
        };

        const serverStop = {
            collapsibleState: TreeItemCollapsibleState.Expanded,
            label: `id (Stopped) (undefined)`,
            contextValue: 'Stopped',
            iconPath: Uri.file(path.join(__dirname, '../../images/server-light.png'))
        };

        const serverStart = {
            collapsibleState: TreeItemCollapsibleState.Expanded,
            label: 'id (Started) (undefined)',
            contextValue: 'Started',
            iconPath: Uri.file(path.join(__dirname, '../../images/server-light.png'))
        };

        const serverUnknown = {
            collapsibleState: TreeItemCollapsibleState.Expanded,
            label: 'id (Unknown) (undefined)',
            contextValue: 'Unknown',
            iconPath: Uri.file(path.join(__dirname, '../../images/server-light.png'))
        };

        setup(() => {
            serverExplorer.serverStatus =  new Map<string, Protocol.ServerState>([['server', serverState]]);
	    //getServersStub = sandbox.stub(serverExplorer.serverStatus, 'get').returns(serverState);
            setStatusStub = sandbox.stub(serverExplorer.serverStatus, 'set');
        });

        test('call should update server state to received in state change event (Stopped)', () => {
            sandbox.stub(serverExplorer.runStateEnum, 'get').returns('Stopped');
            const children = serverExplorer.getChildren();
            const treeItem = serverExplorer.getTreeItem(serverState);

            serverExplorer.updateServer(stateChangeStopping);
            serverExplorer.refresh();
            serverExplorer.updateServer(stateChangeStopped);

            expect(setStatusStub).calledTwice;
            expect(getStub).calledTwice;
            expect(children).deep.equals([serverState]);
            expect(treeItem).deep.equals(serverStop);
        });

        test('call should update server state to received in state change event (Started)', () => {
            sandbox.stub(serverExplorer.runStateEnum, 'get').returns('Started');
            const children = serverExplorer.getChildren();
            const treeItem = serverExplorer.getTreeItem(serverState);

            serverExplorer.updateServer(stateChangeStarting);
            serverExplorer.refresh();
            serverExplorer.updateServer(stateChangeStarted);


            expect(setStatusStub).calledTwice;
            expect(getStub).calledTwice;
            expect(children).deep.equals([serverState]);
            expect(treeItem).deep.equals(serverStart);
        });

        test('call should update server state to received in state change event (Unknown)', () => {
            sandbox.stub(serverExplorer.runStateEnum, 'get').returns('Unknown');
            const children = serverExplorer.getChildren();
            const treeItem = serverExplorer.getTreeItem(serverState);

            serverExplorer.updateServer(stateChangeUnknown);

            expect(setStatusStub).calledOnce;
            expect(getStub).calledOnce;
            expect(children).deep.equals([serverState]);
            expect(treeItem).deep.equals(serverUnknown);
        });
    });

    suite('addLocation', () => {
        let findServerStub: sinon.SinonStub;
        let showOpenDialogStub: sinon.SinonStub;

        const serverBean: Protocol.ServerBean = {
            fullVersion: 'version',
            location: 'path',
            name: 'EAP',
            serverAdapterTypeId: 'org.jboss',
            specificType: 'EAP',
            typeCategory: 'EAP',
            version: '7.1'
        };

        const noAttributes: Protocol.RequiredAttributes = {
            attributes: new Map<String, Protocol.Attribute>()
        };
        const status = {
            code: 0,
            message: 'ok',
            pluginId: 'unknown',
            severity: 0
        };

        const discoveryPath = { fsPath: 'path/path' };

        setup(() => {
            findServerStub = sandbox.stub(clientStub, 'findServerBeans').resolves([serverBean]);
            showOpenDialogStub = sandbox.stub(window, 'showOpenDialog').resolves([discoveryPath]);
        });

        test('should detect the server in a given location', async () => {
            const inputBoxStub = sandbox.stub(window, 'showInputBox');
            inputBoxStub.onFirstCall().resolves('eap');
            inputBoxStub.onSecondCall().resolves('No');
            sandbox.stub(clientStub, 'createServerAsync').resolves(status);
            sandbox.stub(clientStub, 'getServerTypeRequiredAttributes').resolves(noAttributes);
            sandbox.stub(clientStub, 'getServerTypeOptionalAttributes').resolves(noAttributes);
            await serverExplorer.addLocation();

            expect(findServerStub).calledOnceWith(discoveryPath.fsPath);
            expect(showOpenDialogStub).calledOnce;
        });

        test('should call client.createServerAsync with detected server bean for location and name provided by user', async () => {
            const inputBoxStub = sandbox.stub(window, 'showInputBox');
            inputBoxStub.onFirstCall().resolves('eap');
            inputBoxStub.onSecondCall().resolves('No');
            sandbox.stub(clientStub, 'getServerTypeRequiredAttributes').resolves(noAttributes);
            sandbox.stub(clientStub, 'getServerTypeOptionalAttributes').resolves(noAttributes);
            const createServerStub = sandbox.stub(clientStub, 'createServerAsync').resolves(status);
            await serverExplorer.addLocation();

            expect(createServerStub).calledOnceWith(serverBean, 'eap');
        });

        test('should error if no server detected in provided location', async () => {
            findServerStub.resolves([]);

            try {
                await serverExplorer.addLocation();
                expect.fail();
            } catch (err) {
                expect(err).equals('Cannot detect server in selected location!');
            }
        });
    });
});
