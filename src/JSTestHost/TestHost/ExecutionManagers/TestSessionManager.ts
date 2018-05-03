import { IEnvironment } from '../../Environment/IEnvironment';
import { TestSessionEventArgs } from '../../ObjectModel/TestFramework';
import { IEvent, IEventArgs } from '../../ObjectModel/Common';
import { CodeCoverage, CoverageReporter } from '../CodeCoverage';
import { RunSettings } from '../RunSettings';

interface TestSession {
    Source: string;
    TestSessionEventArgs: TestSessionEventArgs;
    Job: () => void;
    ErrorCallback: (err: Error) => void;
    Complete: boolean;
    Coverage: CodeCoverage;
    CoverageMap: any;
}

export class TestSessionManager {
    private runSettings: RunSettings;
    private testSessionBucket: Map<string, TestSession>;
    private testSessionIterator: IterableIterator<TestSession>;
    private sessionCompleteCount: number;
    private sessionCount: number;
    private covReporter: CoverageReporter;
    public onSessionsComplete: IEvent<IEventArgs>;
    
    constructor(environment: IEnvironment) {
        this.sessionCount = 0;
        this.sessionCompleteCount = 0;
        this.onSessionsComplete = environment.createEvent();
        this.testSessionBucket = new Map();
        this.testSessionIterator = this.testSessionBucket.values();
        this.covReporter = new CoverageReporter();
    }

    public setRunSettings(runsettings: RunSettings) {
        this.runSettings = runsettings;
    }

    public setSessionComplete(args: TestSessionEventArgs) {
        const testSession = this.testSessionBucket.get(args.Source);
        testSession.TestSessionEventArgs = args;
        if (!testSession.Complete) {
            this.sessionCompleteCount++;

            const nextSession = this.testSessionIterator.next();

            if (this.runSettings.isCodeCoverageEnabled()) {
                this.covReporter.addCoverage(testSession.Coverage.stopCoverage());
            }

            if (!nextSession.done) {
                this.runSessionInDomain(nextSession.value);
            }
        }
        testSession.Complete = true;

        this.testSessionBucket.set(args.Source, testSession);

        // Check for all session completion
        if (this.sessionCount === this.sessionCompleteCount) {
            this.covReporter.report();
            this.onSessionsComplete.raise(this, {});
        }
    }

    public addSession(source: string, job: () => void, errorCallback: (err: Error) => void) {
        const testSession = <TestSession> {
            Source: source,
            TestSessionEventArgs: null,
            Job: job,
            ErrorCallback: errorCallback,
            Complete: false
        };

        this.testSessionBucket.set(source, testSession);
        this.sessionCount++;

        if (this.sessionCount === 1) {
            this.runSessionInDomain(this.testSessionIterator.next().value);
        }
    }

    public updateSessionEventArgs(args: TestSessionEventArgs) {
        const testSession = this.testSessionBucket.get(args.Source);
        testSession.TestSessionEventArgs = args;
        this.testSessionBucket.set(args.Source, testSession);
    }

    public getSessionEventArgs(source: string): TestSessionEventArgs {
        return this.testSessionBucket.get(source).TestSessionEventArgs;
    }

    private runSessionInDomain(testSession: TestSession) {
        // tslint:disable-next-line:no-require-imports
        const domain = require('domain');

        const executionDomain = domain.create();
        try {
            executionDomain.on('error', (err: Error) => {
                // this.sessionComplete(source, null, err);
                testSession.ErrorCallback(err);
            });
            executionDomain.run(() => {
                if (this.runSettings.isCodeCoverageEnabled()) {
                    testSession.Coverage = new CodeCoverage();
                    testSession.Coverage.startCoverage(testSession.Job);
                } else {
                    testSession.Job();
                }
            });
        } catch (err) {
            console.error('domain did not catch the error. hmmmm');
            // this.sessionComplete(source, null, err);
            testSession.ErrorCallback(err);
            // TODO log message
        }
    }
}