// utils/pipelineBuilder.js

class PipelineBuilder {
    constructor(initial = []) {
        this.pipeline = [...initial];
    }

    expand(stages = []) {
        if (Array.isArray(stages)) {
            this.pipeline.push(...stages);
        }
        return this;
    }

    push(stage) {
        this.pipeline.push(stage);
        return this;
    }

    build() {
        return this.pipeline;
    }
}

module.exports = {
    PipelineBuilder
};
