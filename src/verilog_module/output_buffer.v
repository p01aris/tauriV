module output_buffer (
    input wire clk,
    input wire [7:0] data_in,
    output reg [7:0] data_out
);

    always @(posedge clk) begin
        data_out <= data_in;
    end

endmodule