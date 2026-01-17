//@ts-check

import { MultiSelect, Select } from "@mantine/core";
import {

    FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
    INDEX_ONLY_DEDUPLICATION_STRATEGY,
    NONE_DEDUPLICATION_STRATEGY
} from "./../../../utils/constant"

const SelectDeduplicationStrategy = ({
    ...props
}) => {

    const available_strategy = [
        { value: FULL_PAYLOAD_DEDUPLICATION_STRATEGY, label: 'Full Payload (Recommended)' },
        { value: INDEX_ONLY_DEDUPLICATION_STRATEGY, label: 'Index Only (Space Efficient)' },
        { value: NONE_DEDUPLICATION_STRATEGY, label: 'None (Maximum Detail)' }
    ]

    return (
        <>
            <Select
                label="Deduplication Strategy"
                description={<>
                    Controls how duplicate logs are handled. <br /> FULL_PAYLOAD: exact matches only. <br />INDEX_ONLY: group by indexed fields (reduces storage). <br />NONE: store every log separately.</>}
                placeholder="Select Strategy"
                data={available_strategy}
                {...props}
            />
        </>
    )
}

export default SelectDeduplicationStrategy