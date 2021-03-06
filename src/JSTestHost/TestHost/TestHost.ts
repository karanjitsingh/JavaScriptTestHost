import { TestRunCriteriaWithSources, DiscoveryCriteria, TestRunCriteriaWithTests } from '../ObjectModel/Payloads';
import { MessageType } from '../ObjectModel';
import { IEnvironment } from '../Environment/IEnvironment';
import { ICommunicationManager, MessageReceivedEventArgs } from '../Environment/ICommunicationManager';
import { Exception, ExceptionType } from '../Exceptions/Exception';
import { JobQueue } from '../Utils/JobQueue';
import { MessageSender } from './MessageSender';
import { ArgumentProcessor } from './Processors/ArgumentProcessor';
import { ExecutionManager, DiscoveryManager } from './ExecutionManagers';
import { TestHostSettings } from './TestHostSettings';

export class TestHost {
    private readonly environment: IEnvironment;
    private readonly communicationManager: ICommunicationManager;
    private readonly jobQueue: JobQueue;
    private readonly messageSender: MessageSender;
    private readonly testHostSettings: TestHostSettings;

    private sessionEnded: boolean;

    constructor(environment: IEnvironment) {
        this.environment = environment;
        this.sessionEnded = false;
        this.jobQueue = new JobQueue();
        this.testHostSettings = ArgumentProcessor.processArguments(this.environment.argv);
        
        let dcCommManager: ICommunicationManager;
        if (this.testHostSettings.DataCollectionPort) {
            dcCommManager = environment.createCommunicationManager();
            dcCommManager.connectToServer(this.testHostSettings.DataCollectionPort, this.testHostSettings.EndpointIP);
        }
        this.communicationManager = environment.createCommunicationManager();
        this.messageSender = new MessageSender(this.communicationManager, dcCommManager);
        
        this.initializeCommunication();
    }

    private initializeCommunication() {
        this.communicationManager.onMessageReceived.subscribe(this.messageReceived);
        this.communicationManager.connectToServer(this.testHostSettings.Port, this.testHostSettings.EndpointIP);
        this.waitForSessionEnd();
    }

    private waitForSessionEnd() {
        if (!this.sessionEnded) {
            setTimeout(this.waitForSessionEnd.bind(this), 1000);
        }
    }

    private messageReceived = (sender: object, args: MessageReceivedEventArgs) => {
        const message = args.Message;
        console.log('Message Received', message);

        switch (message.MessageType) {
            case MessageType.VersionCheck:
                this.messageSender.sendVersionCheck();
                break;

            case MessageType.StartTestExecutionWithSources:
                const executionManager = new ExecutionManager(this.environment, this.messageSender, this.testHostSettings.TestFramework);
    
                const runWithSourcesPayload = <TestRunCriteriaWithSources>message.Payload;
                this.jobQueue.queuePromise(executionManager.startTestRunWithSources(runWithSourcesPayload));
                break;

            case MessageType.StartTestExecutionWithTests:
                const executionManager2 = new ExecutionManager(this.environment, this.messageSender, this.testHostSettings.TestFramework);
    
                const runWithTestsPayload = <TestRunCriteriaWithTests>message.Payload;
                this.jobQueue.queuePromise(executionManager2.startTestRunWithTests(runWithTestsPayload));
                break;

            case MessageType.StartDiscovery:
                const discoveryManager = new DiscoveryManager(this.environment, this.messageSender, this.testHostSettings.TestFramework);

                const discoveryPayload = <DiscoveryCriteria>message.Payload;
                this.jobQueue.queuePromise(discoveryManager.discoverTests(discoveryPayload));
                break;

            case MessageType.SessionEnd:
                this.sessionEnded = true;
                process.exit(0);
        }
    }

}