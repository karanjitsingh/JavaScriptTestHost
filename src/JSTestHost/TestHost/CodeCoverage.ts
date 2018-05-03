import * as istanbulApi from 'istanbul-api';
import * as libCoverage from 'istanbul-lib-coverage';

interface Istanbul {
    coverageMap: any;
    exitFn: any;
    hookFn: any;
    fn: any;
}

export class CoverageReporter {
    private coverageMap: any;
    
    constructor() {
        this.coverageMap = libCoverage.createCoverageMap({});

    }

    public addCoverage(map: any) {
        this.coverageMap.merge(map);
    }

    public report() {
        const configOverrides = {   
            verbose:  false,
            instrumentation: {
                'include-all-sources': false,
                root: 'D:\\JavaScriptTestHost\\test\\JSTestHost.UnitTests\\bin\\',
                excludes: []
                
            },
            reporting: {
                print: 'none',
                reports: [ ],
                dir: './coverage'
            }
        };

        const config = this.getConfig(configOverrides);

        const reporter = istanbulApi.createReporter(config);
        reporter.write(this.coverageMap);
    }

    private getConfig(overrides: Object) {
        return istanbulApi.config.loadObject({}, overrides);
    }
}

export class CodeCoverage {
    private source: string;
    private istanbul: Istanbul;
    private executeJob: () => void;

    constructor(source?: string) {

        this.source = source;

        const configOverrides = {   
            verbose:  false,
            instrumentation: {
                'include-all-sources': false,
                root: 'D:\\JavaScriptTestHost\\test\\JSTestHost.UnitTests\\bin\\',
                excludes: []
                
            },
            reporting: {
                print: 'none',
                reports: [ ],
                dir: './coverage'
            }
        };

        const config = this.getConfig(configOverrides);
        istanbulApi.cover.getCoverFunctions(config, this.getCoverFunctionsCallback.bind(this));
    }

    public stopCoverage() {
        this.istanbul.exitFn();
        return this.istanbul.coverageMap;
    }

    public startCoverage(job: () => void) {
        this.executeJob = job;
        if (this.istanbul !== undefined) {
            this.hookIstanbulAndExecuteJob();
        }
    }

    private hookIstanbulAndExecuteJob() {
        this.istanbul.hookFn();
        this.executeJob();
        this.istanbul.coverageMap = this.istanbul.fn();
    }
    
    private getCoverFunctionsCallback(err: any, data: any) {
        if (err) {
            // report error with code coverage
            console.error('error with code coverage');
        }

        this.istanbul = <Istanbul> {
            fn: data.coverageFn,
            hookFn: data.hookFn,
            exitFn: data.exitFn,
            coverageMap: null
        };

        if (this.executeJob) {
            this.hookIstanbulAndExecuteJob();
        }
    }

    private getConfig(overrides: Object) {
        return istanbulApi.config.loadObject({}, overrides);
    }
}